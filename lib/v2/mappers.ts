import type { CreationType, PlatformTag, V2Artist, V2Song } from './types'
import { artistCommunitySlug } from './slug'

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80'

type ArtistRow = {
  id: string
  name: string
  genre?: string | null
  description?: string | null
  avatar_url?: string | null
  spotify_image_url?: string | null
  social_links?: Record<string, { url?: string }> | null
  page_slug?: string | null
  page_enabled?: boolean | null
}

type SongRow = {
  id: string
  artist_id: string
  title: string
  status?: string | null
  lyrics_instructions?: string | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  spotify_url?: string | null
  media_links?: { platform: string; url: string }[] | null
  publish_content?: Record<string, unknown> | null
}

type ArtistNameLookup = Record<string, { name: string; slug: string }>

function inferCreationType(publishContent?: Record<string, unknown> | null): CreationType {
  const raw = (publishContent as { creation_type?: string } | null)?.creation_type
  if (raw === 'human' || raw === 'ai_assisted' || raw === 'fully_ai' || raw === 'hybrid') return raw
  return 'hybrid'
}

function platformKey(raw: string): PlatformTag | null {
  const p = raw.toLowerCase()
  if (p.includes('spotify')) return 'spotify'
  if (p.includes('youtube')) return 'youtube'
  if (p.includes('tidal')) return 'tidal'
  if (p.includes('apple')) return 'apple'
  if (p.includes('soundcloud')) return 'soundcloud'
  return null
}

function extractPlatforms(song: SongRow): Partial<Record<PlatformTag, string>> {
  const out: Partial<Record<PlatformTag, string>> = {}
  if (song.spotify_url?.trim()) out.spotify = song.spotify_url.trim()
  for (const link of song.media_links || []) {
    const key = platformKey(link.platform || '')
    if (key && link.url?.trim()) out[key] = link.url.trim()
  }
  return out
}

function extractArtistPlatforms(artist: ArtistRow): PlatformTag[] {
  const set = new Set<PlatformTag>()
  const links = artist.social_links || {}
  for (const val of Object.values(links)) {
    const url = val?.url || ''
    const key = platformKey(url) || platformKey(Object.keys(links).find(k => links[k] === val) || '')
    if (key) set.add(key)
  }
  if (artist.spotify_image_url) set.add('spotify')
  return Array.from(set)
}

export function mapArtistRow(
  artist: ArtistRow,
  opts?: { songCount?: number; circleCount?: number },
): V2Artist {
  const cover = artist.spotify_image_url || artist.avatar_url || DEFAULT_COVER
  return {
    id: artist.id,
    slug: artistCommunitySlug(artist),
    name: artist.name,
    bio: artist.description?.trim() || `${artist.genre || 'Independent'} artist on ViaTone.`,
    genre: artist.genre?.trim() || 'Independent',
    coverImageUrl: cover,
    avatarInitial: (artist.name.trim()[0] || 'A').toUpperCase(),
    creationType: 'hybrid',
    songCount: opts?.songCount ?? 0,
    circleCount: opts?.circleCount ?? 0,
    platforms: extractArtistPlatforms(artist),
    legacyArtistId: artist.id,
    publicPageSlug: artist.page_slug || undefined,
  }
}

export function mapSongRow(song: SongRow, artist?: { name: string; slug: string } | null): V2Song {
  const platforms = extractPlatforms(song)
  const hasLinks = Object.keys(platforms).length > 0
  const releaseStatus: V2Song['releaseStatus'] =
    song.status === 'released' || hasLinks ? (hasLinks ? 'released' : 'needs_links') : 'draft'

  return {
    id: song.id,
    title: song.title,
    artistSlug: artist?.slug || song.artist_id,
    artistName: artist?.name || 'Unknown artist',
    coverImageUrl: song.cover_image_url || song.spotify_cover_url || DEFAULT_COVER,
    creationType: inferCreationType(song.publish_content),
    releaseStatus,
    needsFeedback: releaseStatus === 'draft' || releaseStatus === 'needs_links',
    platforms,
    pitch: song.lyrics_instructions?.trim() || undefined,
    legacySongId: song.id,
  }
}

export function buildArtistNameLookup(artists: ArtistRow[]): ArtistNameLookup {
  const lookup: ArtistNameLookup = {}
  for (const a of artists) {
    lookup[a.id] = { name: a.name, slug: artistCommunitySlug(a) }
  }
  return lookup
}
