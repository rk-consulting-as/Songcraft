import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyToken } from '@/lib/spotify'

// GET /api/spotify/tracks?artistId=<spotify_artist_id>&market=NO
// Returns the artist's top 10 tracks with the metadata we want to import.
//
// Note: Spotify's public Web API does NOT expose stream/play counts. The closest proxy is
// `popularity` (0-100, relative score). We surface that as `popularity`.
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId')
  const market = req.nextUrl.searchParams.get('market') || 'NO'
  if (!artistId) {
    return NextResponse.json({ tracks: [], error: 'Missing artistId' }, { status: 400 })
  }

  try {
    const token = await getSpotifyToken()
    const res = await fetch(
      `https://api.spotify.com/v1/artists/${encodeURIComponent(artistId)}/top-tracks?market=${encodeURIComponent(market)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      return NextResponse.json({ tracks: [], error: `Spotify error: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    const tracks = (data.tracks || []).map((t: any) => ({
      id: t.id as string,
      title: t.name as string,
      album: t.album?.name as string | undefined,
      releaseDate: t.album?.release_date as string | undefined,  // YYYY, YYYY-MM, or YYYY-MM-DD
      durationMs: t.duration_ms as number | undefined,
      popularity: (t.popularity ?? 0) as number,
      coverUrl: (t.album?.images?.[0]?.url as string | undefined) || null,
      spotifyUrl: (t.external_urls?.spotify as string | undefined) || null,
      explicit: !!t.explicit,
      previewUrl: t.preview_url as string | null,
    }))
    return NextResponse.json({ tracks })
  } catch (e: any) {
    return NextResponse.json({ tracks: [], error: e?.message || 'Spotify request failed' }, { status: 500 })
  }
}
