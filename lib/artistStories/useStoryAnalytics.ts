'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type StoryAnalyticsRow = {
  views: number
  recentViews: number
  newsletterSignups: number
  songClicks: number
  lastViewAt: string | null
}

export type StoryAnalyticsMap = Record<string, StoryAnalyticsRow>

const EMPTY_ROW: StoryAnalyticsRow = {
  views: 0,
  recentViews: 0,
  newsletterSignups: 0,
  songClicks: 0,
  lastViewAt: null,
}

function storyIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const id = (metadata as { story_id?: string }).story_id
  return typeof id === 'string' && id.length > 0 ? id : null
}

export function useStoryAnalytics(artistId: string, stories: { id: string; slug: string }[]) {
  const [byStoryId, setByStoryId] = useState<StoryAnalyticsMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!artistId) {
      setByStoryId({})
      setLoading(false)
      return
    }

    let cancelled = false
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

    async function load() {
      setLoading(true)
      const supabase = createClient()
      const [eventsRes, subsRes] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('event_type, metadata, created_at')
          .eq('artist_id', artistId)
          .in('event_type', ['story_view', 'story_song_click', 'newsletter_signup'])
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase
          .from('newsletter_subscribers')
          .select('source_page')
          .eq('artist_id', artistId)
          .like('source_page', '%/stories/%')
          .limit(2000),
      ])

      if (cancelled) return

      const map: StoryAnalyticsMap = {}
      for (const ev of eventsRes.data || []) {
        const storyId = storyIdFromMetadata(ev.metadata)
        if (!storyId) continue
        if (!map[storyId]) map[storyId] = { ...EMPTY_ROW }
        const row = map[storyId]
        const at = ev.created_at as string
        if (ev.event_type === 'story_view') {
          row.views += 1
          if (new Date(at).getTime() >= recentCutoff) row.recentViews += 1
          if (!row.lastViewAt || at > row.lastViewAt) row.lastViewAt = at
        }
        if (ev.event_type === 'story_song_click') row.songClicks += 1
      }

      for (const story of stories) {
        const needle = `/stories/${story.slug}`
        const nlCount = (subsRes.data || []).filter(s => (s.source_page || '').includes(needle)).length
        if (nlCount === 0) continue
        if (!map[story.id]) map[story.id] = { ...EMPTY_ROW }
        map[story.id].newsletterSignups = nlCount
      }

      setByStoryId(map)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [artistId, stories.map(s => s.id).join(',')])

  return { byStoryId, loading }
}
