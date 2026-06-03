import { absoluteAppUrl } from '@/lib/appUrl'
import { resolveArtistOgImage } from '@/lib/mediaLibrary/resolveImages'
import type { CreatorPageSettings } from '@/lib/creatorIdentity/types'
import { getFeaturedRelease, resolveFeaturedOrLatestSong } from '@/lib/creatorIdentity/compute'

type ArtistMetaInput = {
  artist: {
    name: string
    description?: string | null
    genre?: string | null
    page_slug?: string | null
    spotify_url?: string | null
    avatar_url?: string | null
    spotify_image_url?: string | null
    favicon_url?: string | null
    page_settings?: CreatorPageSettings | Record<string, unknown> | null
  }
  songs: { id: string; title: string; status?: string | null; public_hidden?: boolean | null; cover_image_url?: string | null; spotify_cover_url?: string | null; suno_url?: string | null }[]
  albums: { id: string; title: string; cover_url?: string | null; cover_image_url?: string | null }[]
  featuredAsset?: { file_url?: string | null; thumbnail_url?: string | null } | null
}

export function buildArtistPageTitle(name: string): string {
  return `${name} — Official Artist Page`
}

export function buildArtistPageDescription(input: ArtistMetaInput): string {
  const settings = (input.artist.page_settings || {}) as CreatorPageSettings
  const epk = settings.epk as { tagline?: string | null; short_bio?: string | null } | undefined
  const tagline = epk?.tagline?.trim()
  if (tagline) return tagline.slice(0, 160)
  if (input.artist.description?.trim()) return input.artist.description.trim().slice(0, 160)

  const featured = resolveFeaturedOrLatestSong(settings, input.songs, input.albums)
  if (featured?.title) {
    const genre = input.artist.genre?.split(',')[0]?.trim()
    return genre
      ? `Listen to ${featured.title} and explore ${input.artist.name} — ${genre} on ViaTone.`
      : `Listen to ${featured.title} and explore music by ${input.artist.name} on ViaTone.`
  }

  const genre = input.artist.genre?.split(',')[0]?.trim()
  return genre
    ? `${input.artist.name} — ${genre}. Music, releases, and fan page on ViaTone.`
    : `${input.artist.name} — music, releases, and fan page on ViaTone.`
}

export function resolveArtistOgImageForPage(input: ArtistMetaInput): string | undefined {
  const featured = getFeaturedRelease(
    input.artist.page_settings as CreatorPageSettings,
    input.songs,
    input.albums
  )
  const asset = input.featuredAsset?.file_url
    ? {
        file_url: input.featuredAsset.file_url,
        thumbnail_url: input.featuredAsset.thumbnail_url ?? null,
        visibility: 'public' as const,
      }
    : null
  return resolveArtistOgImage({
    artist: input.artist,
    featuredSongCover: featured?.coverUrl || null,
    featuredMediaAsset: asset,
  })
}

export function buildMusicGroupJsonLd(input: ArtistMetaInput & { slug: string }) {
  const settings = (input.artist.page_settings || {}) as CreatorPageSettings
  const pageUrl = absoluteAppUrl(`/p/${input.slug}`)
  const image = resolveArtistOgImageForPage(input)
  const featured = resolveFeaturedOrLatestSong(settings, input.songs, input.albums)
  const genres = input.artist.genre?.split(',').map(g => g.trim()).filter(Boolean) || []

  const sameAs: string[] = []
  if (input.artist.spotify_url) sameAs.push(input.artist.spotify_url)
  const social = (input.artist as { social_links?: Record<string, { url?: string } | null> }).social_links
  if (social) {
    for (const link of Object.values(social)) {
      if (link?.url) sameAs.push(link.url)
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: input.artist.name,
    url: pageUrl,
    description: buildArtistPageDescription(input),
    ...(image ? { image: image.startsWith('http') ? image : absoluteAppUrl(image) } : {}),
    ...(genres.length ? { genre: genres } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(featured?.href
      ? {
          track: {
            '@type': 'MusicRecording',
            name: featured.title,
            url: absoluteAppUrl(featured.href),
          },
        }
      : {}),
  }
}
