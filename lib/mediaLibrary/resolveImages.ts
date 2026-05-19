import { absoluteAppUrl } from '@/lib/appUrl'
import { getBrandKit } from './brandKit'
import type { MediaAsset } from './types'
import type { EpkSettings } from './epkSettings'
import type { EpkSong } from '@/lib/epkSongs'
import { getEpkSongCover } from '@/lib/epkSongs'

export const FALLBACK_OG_IMAGE = '/icons/icon-512.svg'

export type PublicArtistImages = {
  hero: string | null
  profile: string | null
  logo: string | null
}

type ArtistLike = {
  avatar_url?: string | null
  spotify_image_url?: string | null
  page_settings?: Record<string, unknown> | null
}

/** Brand kit → legacy avatar/Spotify fallbacks. */
export function resolvePublicArtistImages(artist: ArtistLike): PublicArtistImages {
  const kit = getBrandKit(artist.page_settings)
  const legacyProfile = artist.spotify_image_url || artist.avatar_url || null
  const legacyHero = artist.spotify_image_url || artist.avatar_url || null

  return {
    hero: kit.hero_url || legacyHero,
    profile: kit.profile_url || artist.avatar_url || artist.spotify_image_url || null,
    logo: kit.logo_url || null,
  }
}

export function resolveEpkHeroImage(
  artist: ArtistLike,
  epk: EpkSettings | null | undefined,
  songs: EpkSong[] = []
): string | null {
  const kit = getBrandKit(artist.page_settings)
  const fromSongs = songs.map(s => resolveEpkSongCoverWithOverrides(s, epk)).find(Boolean)

  return (
    epk?.image_url ||
    epk?.cover_image_url ||
    epk?.press_image_url ||
    kit.hero_url ||
    kit.profile_url ||
    artist.spotify_image_url ||
    artist.avatar_url ||
    fromSongs ||
    null
  )
}

export function resolveEpkSongCoverWithOverrides(
  song: EpkSong,
  epk?: EpkSettings | null
): string | null {
  const override = epk?.song_cover_assets?.[song.id]
  if (override?.url) return override.url
  return getEpkSongCover(song)
}

export function resolveArtistOgImage(opts: {
  artist: ArtistLike
  featuredSongCover?: string | null
  featuredMediaAsset?: Pick<MediaAsset, 'file_url' | 'thumbnail_url' | 'visibility'> | null
}): string {
  const images = resolvePublicArtistImages(opts.artist)
  const featuredUrl =
    opts.featuredMediaAsset?.visibility === 'public'
      ? opts.featuredMediaAsset.thumbnail_url || opts.featuredMediaAsset.file_url
      : null

  const candidate =
    images.hero ||
    images.profile ||
    opts.featuredSongCover ||
    featuredUrl ||
    images.logo ||
    opts.artist.spotify_image_url ||
    opts.artist.avatar_url ||
    FALLBACK_OG_IMAGE

  return candidate.startsWith('http') ? candidate : absoluteAppUrl(candidate)
}

export function resolveSongOgImage(opts: {
  songCover?: string | null
  artist: ArtistLike
  featuredMediaAsset?: Pick<MediaAsset, 'file_url' | 'thumbnail_url' | 'visibility'> | null
}): string {
  const images = resolvePublicArtistImages(opts.artist)
  const featuredUrl = opts.featuredMediaAsset
    ? opts.featuredMediaAsset.visibility === 'public'
      ? opts.featuredMediaAsset.thumbnail_url || opts.featuredMediaAsset.file_url
      : null
    : null

  const candidate =
    images.hero ||
    images.profile ||
    opts.songCover ||
    featuredUrl ||
    images.logo ||
    opts.artist.spotify_image_url ||
    opts.artist.avatar_url ||
    FALLBACK_OG_IMAGE

  return candidate.startsWith('http') ? candidate : absoluteAppUrl(candidate)
}
