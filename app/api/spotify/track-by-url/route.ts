import { NextRequest, NextResponse } from 'next/server'
import { spotifyFetch } from '@/lib/spotify'

// GET /api/spotify/track-by-url?url=<spotify track url, URI, or bare id>&market=NO
//
// Accepted input formats:
//   - https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=...
//   - http://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh
//   - spotify:track:4iV5W9uYEdYUVa79Axb7Rh
//   - 4iV5W9uYEdYUVa79Axb7Rh           (bare ID, 22 chars base62)
//
// Calls Spotify's `/v1/tracks/{id}` (works in development quota, no extended access required)
// and returns the track in the same shape as /api/spotify/tracks (single, in array of length 1).

const TRACK_ID_RE = /^[A-Za-z0-9]{22}$/

function extractTrackId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  // Bare ID
  if (TRACK_ID_RE.test(raw)) return raw

  // URI form: spotify:track:ID
  const uriMatch = /^spotify:track:([A-Za-z0-9]{22})$/i.exec(raw)
  if (uriMatch) return uriMatch[1]

  // URL form
  try {
    const url = new URL(raw.startsWith('http') ? raw : 'https://' + raw)
    if (!/^open\.spotify\.com$|spotify\.link$/i.test(url.hostname)) return null
    const segments = url.pathname.split('/').filter(Boolean)
    // Path can be ['track', ID] or ['intl-xx', 'track', ID]
    const trackIdx = segments.findIndex(s => s.toLowerCase() === 'track')
    if (trackIdx >= 0 && segments[trackIdx + 1] && TRACK_ID_RE.test(segments[trackIdx + 1])) {
      return segments[trackIdx + 1]
    }
  } catch {
    return null
  }
  return null
}

function mapTrack(t: any) {
  return {
    id: t.id as string,
    title: t.name as string,
    album: t.album?.name as string | undefined,
    releaseDate: t.album?.release_date as string | undefined,
    durationMs: t.duration_ms as number | undefined,
    popularity: (t.popularity ?? 0) as number,
    coverUrl: (t.album?.images?.[0]?.url as string | undefined) || null,
    spotifyUrl: (t.external_urls?.spotify as string | undefined) || null,
    explicit: !!t.explicit,
    previewUrl: t.preview_url as string | null,
    artists: (t.artists || []).map((a: any) => ({ id: a.id as string, name: a.name as string })),
  }
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('url') || req.nextUrl.searchParams.get('id') || ''
  const market = req.nextUrl.searchParams.get('market') || 'NO'

  const id = extractTrackId(input)
  if (!id) {
    return NextResponse.json(
      { track: null, error: 'Could not parse a Spotify track ID from the input.' },
      { status: 400 }
    )
  }

  try {
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/tracks/${encodeURIComponent(id)}?market=${encodeURIComponent(market)}`
    )
    if (!res.ok) {
      let detail = ''
      try { detail = (await res.json())?.error?.message || '' } catch { /* ignore */ }
      return NextResponse.json(
        { track: null, error: `Spotify ${res.status}: ${detail || 'request failed'}` },
        { status: res.status }
      )
    }
    const data = await res.json()
    return NextResponse.json({ track: mapTrack(data) })
  } catch (e: any) {
    return NextResponse.json({ track: null, error: e?.message || 'Spotify request failed' }, { status: 500 })
  }
}
