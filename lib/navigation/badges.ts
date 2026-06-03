import { computeArtistHealth, type ArtistHealthLabel } from '@/lib/dashboard/artistHealthScore'
import type { DashboardSongRow } from '@/lib/dashboard/types'

export type SidebarArtistBadgeKey = 'needs_attention' | 'public_live' | 'release_active' | 'healthy'
export type SidebarSongBadgeKey = 'draft' | 'public_live' | 'missing_cover' | 'release_ready'

export type SidebarBadge = { key: SidebarArtistBadgeKey | SidebarSongBadgeKey; label: string }

export type NavArtistMeta = {
  id: string
  name: string
  genre: string | null
  page_enabled?: boolean | null
  page_slug?: string | null
  page_settings?: Record<string, unknown> | null
  spotify_url?: string | null
  spotify_id?: string | null
  social_links?: Record<string, { url?: string } | null> | null
}

export type NavSongMeta = {
  id: string
  title: string
  artist_id: string | null
  status?: string | null
  public_hidden?: boolean | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  lyrics_text?: string | null
  publish_content?: Record<string, unknown> | null
  media_links?: { platform?: string; url?: string }[] | null
  spotify_url?: string | null
}

function songHasActiveCampaign(song: NavSongMeta): boolean {
  const pc = song.publish_content || {}
  const timeline = Array.isArray((pc as { campaign_timeline?: unknown[] }).campaign_timeline)
    ? (pc as { campaign_timeline: unknown[] }).campaign_timeline
    : []
  return timeline.length > 0 || !!(pc as { distribution?: unknown }).distribution
}

export function getArtistSidebarBadges(
  artist: NavArtistMeta,
  songs: NavSongMeta[],
  tx: Record<string, string>,
): SidebarBadge[] {
  const artistSongs = songs.filter(s => s.artist_id === artist.id)
  const health = computeArtistHealth(
    artist as Parameters<typeof computeArtistHealth>[0],
    artistSongs as DashboardSongRow[],
    0,
    artistSongs.some(songHasActiveCampaign),
    tx,
  )

  const badges: SidebarBadge[] = []

  if (health.label === 'needs_attention') {
    badges.push({ key: 'needs_attention', label: tx.sidebarBadgeNeedsAttention })
  }
  if (health.label === 'healthy') {
    badges.push({ key: 'healthy', label: tx.sidebarBadgeHealthy })
  }
  if (artist.page_enabled && artist.page_slug) {
    badges.push({ key: 'public_live', label: tx.sidebarBadgePublicLive })
  }
  if (artistSongs.some(s => s.status === 'released' || songHasActiveCampaign(s))) {
    badges.push({ key: 'release_active', label: tx.sidebarBadgeReleaseActive })
  }

  return badges.slice(0, 2)
}

export function getSongSidebarBadges(
  song: NavSongMeta,
  artistPageEnabled: boolean,
  tx: Record<string, string>,
): SidebarBadge[] {
  const badges: SidebarBadge[] = []
  const coverReady = !!(song.cover_image_url || song.spotify_cover_url)
  const hasLyrics = !!song.lyrics_text?.trim()
  const hasMedia = !!(song.spotify_url || (song.media_links?.length ?? 0) > 0)
  const publicLive = artistPageEnabled && !song.public_hidden

  if (song.status !== 'released') {
    badges.push({ key: 'draft', label: tx.sidebarBadgeDraft })
  }
  if (publicLive) {
    badges.push({ key: 'public_live', label: tx.sidebarBadgePublicLive })
  }
  if (!coverReady) {
    badges.push({ key: 'missing_cover', label: tx.sidebarBadgeMissingCover })
  }
  if (hasLyrics && coverReady && hasMedia) {
    badges.push({ key: 'release_ready', label: tx.sidebarBadgeReleaseReady })
  }

  return badges.slice(0, 2)
}

export function healthLabelToBadge(label: ArtistHealthLabel): SidebarArtistBadgeKey | null {
  if (label === 'needs_attention') return 'needs_attention'
  if (label === 'healthy') return 'healthy'
  return null
}
