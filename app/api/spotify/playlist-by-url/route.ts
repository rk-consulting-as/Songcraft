import { NextRequest, NextResponse } from 'next/server'
import { spotifyFetch } from '@/lib/spotify'
import { extractSpotifyPlaylistId, mapSpotifyPlaylist } from '@/lib/playlistCommunities/spotifyPlaylist'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('url') || req.nextUrl.searchParams.get('id') || ''
  const market = req.nextUrl.searchParams.get('market') || 'NO'

  const id = extractSpotifyPlaylistId(input)
  if (!id) {
    return NextResponse.json(
      { playlist: null, error: 'Could not parse a Spotify playlist ID from the input.' },
      { status: 400 }
    )
  }

  try {
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}?market=${encodeURIComponent(market)}`
    )
    if (!res.ok) {
      let detail = ''
      try { detail = (await res.json())?.error?.message || '' } catch { /* ignore */ }
      return NextResponse.json(
        { playlist: null, error: `Spotify ${res.status}: ${detail || 'request failed'}` },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json({ playlist: mapSpotifyPlaylist(data) })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Spotify request failed'
    return NextResponse.json({ playlist: null, error: message }, { status: 500 })
  }
}
