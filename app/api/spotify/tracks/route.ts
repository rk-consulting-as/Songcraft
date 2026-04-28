import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyToken } from '@/lib/spotify'

// GET /api/spotify/tracks?artistId=<id>&artistName=<name>&market=NO
//
// Strategy:
//   1) Try the official Get Artist's Top Tracks endpoint.
//   2) If that returns 403 (common for apps in Development Mode after Spotify's Nov 2024 quota
//      changes) AND we have the artist name, fall back to /search for tracks by that artist,
//      filter to tracks where the linked artist ID matches, sort by popularity, take top 10.
//
// Note: Spotify's public Web API does NOT expose stream/play counts. We surface `popularity`
// (0-100, relative score) only.

type MappedTrack = {
  id: string
  title: string
  album?: string
  releaseDate?: string
  durationMs?: number
  popularity: number
  coverUrl: string | null
  spotifyUrl: string | null
  explicit: boolean
  previewUrl: string | null
}

function mapTrack(t: any): MappedTrack {
  return {
    id: t.id,
    title: t.name,
    album: t.album?.name,
    releaseDate: t.album?.release_date,
    durationMs: t.duration_ms,
    popularity: t.popularity ?? 0,
    coverUrl: t.album?.images?.[0]?.url ?? null,
    spotifyUrl: t.external_urls?.spotify ?? null,
    explicit: !!t.explicit,
    previewUrl: t.preview_url ?? null,
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    return body?.error?.message || JSON.stringify(body)
  } catch {
    try { return await res.text() } catch { return '' }
  }
}

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId')
  const artistName = req.nextUrl.searchParams.get('artistName') || ''
  const market = req.nextUrl.searchParams.get('market') || 'NO'
  if (!artistId) {
    return NextResponse.json({ tracks: [], error: 'Missing artistId' }, { status: 400 })
  }

  const token = await getSpotifyToken()
  const headers = { Authorization: `Bearer ${token}` }

  // 1) Try the official top-tracks endpoint.
  const topRes = await fetch(
    `https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}/top-tracks?market=${encodeURIComponent(market)}`,
    { headers }
  )
  if (topRes.ok) {
    const data = await topRes.json()
    const tracks = (data.tracks || []).map(mapTrack)
    return NextResponse.json({ tracks, source: 'top-tracks' })
  }

  // 2) Fallback for 403 (development-mode quota restrictions).
  if (topRes.status === 403 && artistName) {
    const q = encodeURIComponent(`artist:"${artistName}"`)
    // Spotify's search API caps `limit` at 20 (was 50 in older docs).
    const searchUrl = `https://api.spotify.com/v1/search?q=${q}&type=track&limit=20&market=${encodeURIComponent(market)}`
    const searchRes = await fetch(searchUrl, { headers })
    if (searchRes.ok) {
      const data = await searchRes.json()
      const items: any[] = data.tracks?.items || []
      // Keep only tracks where one of the credited artists matches the linked Spotify artist ID.
      const matching = items.filter(t => Array.isArray(t.artists) && t.artists.some((a: any) => a.id === artistId))
      // De-dup by track id (search may return remixes/duplicates).
      const seen = new Set<string>()
      const deduped = matching.filter(t => (seen.has(t.id) ? false : seen.add(t.id) && true))
      // Sort by popularity desc, take top 10.
      deduped.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      const tracks = deduped.slice(0, 10).map(mapTrack)
      return NextResponse.json({ tracks, source: 'search-fallback' })
    }
    // Search also failed — surface that error.
    const detail = await readError(searchRes)
    return NextResponse.json(
      { tracks: [], error: `Spotify search fallback ${searchRes.status}: ${detail || 'unknown error'}` },
      { status: searchRes.status }
    )
  }

  // Other failure — surface Spotify's message.
  const detail = await readError(topRes)
  return NextResponse.json(
    { tracks: [], error: `Spotify ${topRes.status}: ${detail || 'unknown error'}` },
    { status: topRes.status }
  )
}
