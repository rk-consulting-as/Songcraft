import type { DiscoverSpotlightConfig } from './types'
import type { CreatorPageSettings } from '@/lib/creatorIdentity/types'

export function parseSpotlightConfig(raw: unknown): DiscoverSpotlightConfig {
  if (!raw || typeof raw !== 'object') return { artist_ids: [], song_ids: [] }
  const o = raw as DiscoverSpotlightConfig
  return {
    artist_ids: Array.isArray(o.artist_ids) ? o.artist_ids.filter(Boolean) : [],
    song_ids: Array.isArray(o.song_ids) ? o.song_ids.filter(Boolean) : [],
  }
}

export function isArtistFeaturedOnViaTone(
  artistId: string,
  pageSettings: CreatorPageSettings | null | undefined,
  spotlight: DiscoverSpotlightConfig
): boolean {
  if (pageSettings?.featured_on_viatone) return true
  return (spotlight.artist_ids || []).includes(artistId)
}

export function isSongFeaturedOnViaTone(
  songId: string,
  spotlight: DiscoverSpotlightConfig
): boolean {
  return (spotlight.song_ids || []).includes(songId)
}

export function countPublicCampaigns(
  songs: { publish_content?: Record<string, unknown> | null; public_hidden?: boolean | null }[]
): number {
  return songs.filter(s => {
    if (s.public_hidden) return false
    const pc = s.publish_content || {}
    const timeline = Array.isArray((pc as { campaign_timeline?: unknown[] }).campaign_timeline)
      ? (pc as { campaign_timeline: unknown[] }).campaign_timeline
      : []
    return timeline.length > 0 || !!(pc as { distribution?: unknown }).distribution
  }).length
}
