import { createClient } from '@/lib/supabase'
import type { PlaybookContext } from './types'

export async function fetchPlaybookContext(selectedArtistId?: string | null): Promise<PlaybookContext | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: artists }, { data: songs }, { count: albumCount }, { count: subscriberCount }] = await Promise.all([
    supabase.from('artists').select('id, name, genre, description, avatar_url, spotify_image_url, social_links, page_enabled, page_slug, page_settings').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('songs').select('id, artist_id, title, status, lyrics_text, lyrics_instructions, cover_image_url, spotify_cover_url, spotify_url, media_links, publish_content, album_id, spotify_release_date, public_hidden').eq('user_id', user.id),
    supabase.from('albums').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const artistIds = (artists || []).map(a => a.id)
  let qrClickCount = 0
  let embedViewCount = 0
  let linkClickCount = 0

  if (artistIds.length > 0) {
    const { data: events } = await supabase
      .from('analytics_events')
      .select('event_type, source')
      .in('artist_id', artistIds)
      .limit(5000)

    for (const e of events || []) {
      if (e.event_type === 'embed_view') embedViewCount += 1
      if (e.source === 'qr') qrClickCount += 1
    }

    const { count: clicks } = await supabase
      .from('link_clicks')
      .select('id', { count: 'exact', head: true })
      .in('artist_id', artistIds)

    linkClickCount = clicks || 0
  }

  return {
    userId: user.id,
    artists: artists || [],
    songs: songs || [],
    albumCount: albumCount || 0,
    subscriberCount: subscriberCount || 0,
    qrClickCount,
    embedViewCount,
    linkClickCount,
    selectedArtistId: selectedArtistId || artists?.[0]?.id || null,
  }
}

export async function resolvePostAuthPath(): Promise<string> {
  const ctx = await fetchPlaybookContext()
  if (!ctx) return '/login'

  const { createClient } = await import('@/lib/supabase')
  const supabase = createClient()
  const { isEssentialSetupComplete } = await import('./checks')

  if (isEssentialSetupComplete(ctx)) return '/dashboard'

  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('completed')
    .eq('user_id', ctx.userId)
    .maybeSingle()

  if (progress?.completed) return '/dashboard'
  return '/playbook'
}
