import type { DashboardSongRow } from './types'

export type ArtistHealthLabel = 'healthy' | 'growing' | 'needs_attention'

export type ArtistHealthResult = {
  score: number
  label: ArtistHealthLabel
  labelText: string
}

type ArtistInput = {
  id: string
  page_enabled?: boolean
  page_slug?: string | null
  page_settings?: Record<string, unknown> | null
  spotify_url?: string | null
  spotify_id?: string | null
  social_links?: Record<string, { url?: string }> | null
}

export function computeArtistHealth(
  artist: ArtistInput,
  songs: DashboardSongRow[],
  storyCount: number,
  campaignActive: boolean,
  tx: Record<string, string>,
): ArtistHealthResult {
  const artistSongs = songs.filter(s => s.artist_id === artist.id)
  const ps = (artist.page_settings || {}) as {
    featured_release?: { type?: string; id?: string }
    epk?: { public_enabled?: boolean; short_bio?: string; long_bio?: string }
  }

  const checks = [
    { w: 18, done: artistSongs.length > 0 },
    { w: 16, done: !!(artist.page_enabled && artist.page_slug) },
    { w: 14, done: !!(ps.featured_release?.id) },
    { w: 14, done: !!(ps.epk?.public_enabled && (ps.epk?.short_bio || ps.epk?.long_bio)) },
    { w: 12, done: !!(artist.spotify_url || artist.spotify_id || artist.social_links?.spotify?.url) },
    { w: 12, done: storyCount > 0 },
    { w: 14, done: campaignActive || artistSongs.some(s => s.status === 'released') },
  ]

  const total = checks.reduce((s, c) => s + c.w, 0)
  const done = checks.reduce((s, c) => s + (c.done ? c.w : 0), 0)
  const score = Math.round((done / total) * 100)

  let label: ArtistHealthLabel = 'needs_attention'
  let labelText = tx.adaptHealthNeedsAttention
  if (score >= 75) {
    label = 'healthy'
    labelText = tx.adaptHealthHealthy
  } else if (score >= 45) {
    label = 'growing'
    labelText = tx.adaptHealthGrowing
  }

  return { score, label, labelText }
}
