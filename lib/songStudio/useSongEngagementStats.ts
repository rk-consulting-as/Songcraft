'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type SongEngagementStats = {
  publicPageViews: number
  mediaLinkClicks: number
  qrVisits: number
  embedViews: number
  embedClicks: number
  plays: number
  newsletterSignups: number
  loading: boolean
  error: string | null
}

const EMPTY: SongEngagementStats = {
  publicPageViews: 0,
  mediaLinkClicks: 0,
  qrVisits: 0,
  embedViews: 0,
  embedClicks: 0,
  plays: 0,
  newsletterSignups: 0,
  loading: true,
  error: null,
}

export function useSongEngagementStats(
  songId: string | undefined,
  counters?: { internal_play_count?: number | null; embed_click_count?: number | null },
): SongEngagementStats {
  const [stats, setStats] = useState<SongEngagementStats>(EMPTY)

  useEffect(() => {
    if (!songId) {
      setStats({ ...EMPTY, loading: false })
      return
    }

    let cancelled = false

    async function load() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          if (!cancelled) setStats({ ...EMPTY, loading: false, error: 'not_signed_in' })
          return
        }

        const [eventsRes, linkStatsRes] = await Promise.all([
          supabase
            .from('analytics_events')
            .select('event_type, source')
            .eq('song_id', songId)
            .limit(2000),
          fetch(`/api/link/stats?song_id=${encodeURIComponent(songId as string)}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).then(r => r.ok ? r.json() : null).catch(() => null),
        ])

        if (cancelled) return

        const events = eventsRes.data || []
        const publicPageViews = events.filter(e => e.event_type === 'song_page_view').length
        const embedViews = events.filter(e => e.event_type === 'embed_view').length
        const embedClicksFromEvents = events.filter(e => e.event_type === 'embed_click').length
        const qrFromEvents = events.filter(e => e.event_type === 'song_page_view' && e.source === 'qr').length
        const newsletterSignups = events.filter(e => e.event_type === 'newsletter_signup').length

        const mediaLinkClicks = typeof linkStatsRes?.total === 'number' ? linkStatsRes.total : 0

        setStats({
          publicPageViews,
          mediaLinkClicks,
          qrVisits: qrFromEvents,
          embedViews,
          embedClicks: counters?.embed_click_count ?? embedClicksFromEvents,
          plays: counters?.internal_play_count ?? 0,
          newsletterSignups,
          loading: false,
          error: eventsRes.error ? eventsRes.error.message : null,
        })
      } catch (e: unknown) {
        if (!cancelled) {
          setStats({
            ...EMPTY,
            plays: counters?.internal_play_count ?? 0,
            embedClicks: counters?.embed_click_count ?? 0,
            loading: false,
            error: e instanceof Error ? e.message : 'failed',
          })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [songId, counters?.internal_play_count, counters?.embed_click_count])

  return stats
}
