import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/platformGrowth/seo'
import ArtistPageMinimal from '@/components/artist-templates/ArtistPageMinimal'
import ArtistPageCinematic from '@/components/artist-templates/ArtistPageCinematic'
import ArtistPageDefault from '@/components/artist-templates/ArtistPageDefault'
import {
  buildArtistPageDescription,
  buildArtistPageTitle,
  resolveArtistOgImageForPage,
} from '@/lib/publicArtist/metadata'

// Public artist landing page. Server-rendered, anonymous Supabase client (RLS gates by page_enabled).
// URL: /p/{slug}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

async function fetchPageData(slug: string) {
  const { data: artist, error: artistErr } = await sb.from('artists').select('*').eq('page_slug', slug).eq('page_enabled', true).eq('admin_hidden', false).maybeSingle()
  if (artistErr) console.error('[public-page] artist query error:', artistErr)
  if (!artist) return null

  const [{ data: songs, error: songsErr }, { data: albums, error: albumsErr }, { data: events, error: eventsErr }, { data: featuredAsset }, { data: campaignRows }] = await Promise.all([
    sb.from('songs').select('*').eq('artist_id', artist.id).eq('public_hidden', false)
      .order('position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    sb.from('albums').select('*').eq('artist_id', artist.id)
      .order('release_date', { ascending: false, nullsFirst: false }),
    sb.from('artist_events').select('id, title, date, venue, city, country, ticket_url, status')
      .eq('artist_id', artist.id)
      .in('status', ['scheduled', 'sold_out'])
      .order('date', { ascending: true }),
    sb.from('media_assets').select('file_url, thumbnail_url, visibility, is_featured')
      .eq('artist_id', artist.id)
      .eq('visibility', 'public')
      .eq('is_featured', true)
      .maybeSingle(),
    sb.from('playlist_campaigns').select('id, title, description, playlist_id')
      .eq('artist_id', artist.id)
      .eq('visibility', 'public')
      .in('status', ['open', 'active'])
      .eq('admin_hidden', false)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  if (songsErr) console.error('[public-page] songs query error:', songsErr)
  if (albumsErr) console.error('[public-page] albums query error:', albumsErr)
  if (eventsErr) console.error('[public-page] events query error:', eventsErr)

  let campaigns: { id: string; title: string; description?: string | null; playlistTitle?: string | null }[] = []
  if (campaignRows?.length) {
    const playlistIds = Array.from(new Set(campaignRows.map(c => c.playlist_id).filter(Boolean)))
    const { data: playlists } = playlistIds.length
      ? await sb.from('creator_playlists').select('id, title').in('id', playlistIds)
      : { data: [] }
    const plMap = Object.fromEntries((playlists || []).map(p => [p.id, p.title]))
    campaigns = campaignRows.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      playlistTitle: c.playlist_id ? plMap[c.playlist_id] || null : null,
    }))
  }

  return { artist, songs: songs || [], albums: albums || [], events: events || [], featuredAsset: featuredAsset || null, campaigns }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await fetchPageData(params.slug)
  if (!data) return { title: 'Not found' }

  const metaInput = {
    artist: data.artist,
    songs: data.songs,
    albums: data.albums,
    featuredAsset: data.featuredAsset,
  }
  const title = buildArtistPageTitle(data.artist.name)
  const description = buildArtistPageDescription(metaInput)
  const ogImage = resolveArtistOgImageForPage(metaInput)
  const favicon = data.artist.favicon_url || data.artist.spotify_image_url || data.artist.avatar_url
  const genreKw = data.artist.genre ? data.artist.genre.split(',').map((g: string) => g.trim()) : []

  const meta = buildPublicMetadata({
    title,
    description,
    path: `/p/${params.slug}`,
    image: ogImage,
    keywords: [data.artist.name, ...genreKw, 'independent artist', 'official artist page'],
    type: 'profile',
  })

  return {
    ...meta,
    icons: favicon ? { icon: favicon, shortcut: favicon, apple: favicon } : undefined,
  }
}

export default async function ArtistPublicPage({ params }: { params: { slug: string } }) {
  const data = await fetchPageData(params.slug)
  if (!data) notFound()
  const { artist, songs, albums, events, campaigns } = data

  const template = (artist as { page_template?: string }).page_template || 'default'
  if (template === 'minimal') {
    return <ArtistPageMinimal artist={artist} songs={songs} albums={albums} events={events} />
  }
  if (template === 'cinematic') {
    return <ArtistPageCinematic artist={artist} songs={songs} albums={albums} events={events} />
  }

  return (
    <ArtistPageDefault
      artist={artist}
      songs={songs}
      albums={albums}
      events={events}
      campaigns={campaigns}
    />
  )
}
