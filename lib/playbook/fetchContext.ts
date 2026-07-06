import { createClient } from '@/lib/supabase'
import { getUserPlan } from '@/lib/subscription'
import type { PlaybookContext } from './types'

export async function fetchPlaybookContext(selectedArtistId?: string | null): Promise<PlaybookContext | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const plan = await getUserPlan(supabase, user.id)

  const [
    { data: artists },
    { data: songs },
    { count: albumCount },
    { count: subscriberCount },
    { count: creatorPlaylistCount },
    { count: playlistCampaignCount },
    { count: joinedPlaylistCampaignCount },
    { count: activityProofSubmitCount },
    { count: approvedActivityProofCount },
    { data: ownedCampaignRows },
  ] = await Promise.all([
    supabase.from('artists').select('id, name, genre, description, avatar_url, spotify_image_url, social_links, page_enabled, page_slug, page_settings').eq('user_id', user.id).order('created_at', { ascending: true }),
    supabase.from('songs').select('id, artist_id, title, status, lyrics_text, lyrics_instructions, cover_image_url, spotify_cover_url, spotify_url, media_links, publish_content, album_id, spotify_release_date, public_hidden').eq('user_id', user.id),
    supabase.from('albums').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('creator_playlists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('playlist_campaigns').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('playlist_campaign_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['requested', 'approved']),
    supabase
      .from('campaign_activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['submitted', 'pending', 'approved']),
    supabase
      .from('campaign_activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'approved'),
    supabase.from('playlist_campaigns').select('id, status').eq('user_id', user.id),
  ])

  const hostedActiveCampaignCount = (ownedCampaignRows || []).filter(c =>
    ['open', 'active'].includes(c.status)
  ).length

  let hasCompletedCampaignWeek = false
  const { data: approvedMemberships } = await supabase
    .from('playlist_campaign_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .limit(5)

  if (approvedMemberships?.length) {
    const memberIds = approvedMemberships.map(m => m.id)
    const { count: weekApproved } = await supabase
      .from('campaign_activity_logs')
      .select('id', { count: 'exact', head: true })
      .in('member_id', memberIds)
      .eq('status', 'approved')
    hasCompletedCampaignWeek = (weekApproved || 0) >= 5
  }

  const artistIds = (artists || []).map(a => a.id)
  let qrClickCount = 0
  let embedViewCount = 0
  let linkClickCount = 0

  const { data: userPlaylists } = await supabase
    .from('creator_playlists')
    .select('spotify_url')
    .eq('user_id', user.id)
    .limit(20)
  const hasPlaylistSpotifyUrl = (userPlaylists || []).some(p => !!(p.spotify_url && String(p.spotify_url).trim()))

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
    planId: plan.id,
    creatorPlaylistCount: creatorPlaylistCount || 0,
    playlistCampaignCount: playlistCampaignCount || 0,
    joinedPlaylistCampaignCount: joinedPlaylistCampaignCount || 0,
    hasPlaylistSpotifyUrl,
    activityProofSubmitCount: activityProofSubmitCount || 0,
    approvedActivityProofCount: approvedActivityProofCount || 0,
    hasCompletedCampaignWeek,
    hostedActiveCampaignCount,
  }
}

export async function resolvePostAuthPath(): Promise<string> {
  const ctx = await fetchPlaybookContext()
  if (!ctx) return '/login'

  const { createClient } = await import('@/lib/supabase')
  const supabase = createClient()
  const { isEssentialSetupComplete } = await import('./checks')

  if (isEssentialSetupComplete(ctx)) return '/community'

  const { data: progress } = await supabase
    .from('onboarding_progress')
    .select('completed')
    .eq('user_id', ctx.userId)
    .maybeSingle()

  if (progress?.completed) return '/community'
  return '/playbook'
}
