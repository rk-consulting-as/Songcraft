import { NextRequest, NextResponse } from 'next/server'
import { spotifyFetch } from '@/lib/spotify'

// GET /api/spotify/album-by-url?url=<spotify album URL, URI, or bare ID>
//
// Accepted forms:
//   - https://open.spotify.com/album/{id}?si=...
//   - https://open.spotify.com/intl-en/album/{id}
//   - spotify:album:{id}
//   - {id}                                          (22-char base62)

const ID_RE = /^[A-Za-z0-9]{22}$/

function extractId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (ID_RE.test(raw)) return raw
  const uri = /^spotify:album:([A-Za-z0-9]{22})$/i.exec(raw)
  if (uri) return uri[1]
  try {
    const u = new URL(raw.startsWith('http') ? raw : 'https://' + raw)
    if (!/^open\.spotify\.com$|spotify\.link$/i.test(u.hostname)) return null
    const segs = u.pathname.split('/').filter(Boolean)
    const idx = segs.findIndex(s => s.toLowerCase() === 'album')
    if (idx >= 0 && segs[idx + 1] && ID_RE.test(segs[idx + 1])) return segs[idx + 1]
  } catch { /* ignore */ }
  return null
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('url') || req.nextUrl.searchParams.get('id') || ''
  const market = req.nextUrl.searchParams.get('market') || 'NO'
  const id = extractId(input)
  if (!id) {
    return NextResponse.json({ album: null, error: 'Could not parse a Spotify album ID.' }, { status: 400 })
  }
  try {
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/albums/${encodeURIComponent(id)}?market=${encodeURIComponent(market)}`
    )
    if (!res.ok) {
      let detail = ''
      try { detail = (await res.json())?.error?.message || '' } catch { /* ignore */ }
      return NextResponse.json(
        { album: null, error: `Spotify ${res.status}: ${detail || 'request failed'}` },
        { status: res.status }
      )
    }
    const data = await res.json()
    const album = {
      id: data.id as string,
      title: data.name as string,
      coverUrl: (data.images?.[0]?.url as string | undefined) || null,
      releaseDate: data.release_date as string | undefined,
      totalTracks: data.total_tracks as number | undefined,
      spotifyUrl: data.external_urls?.spotify as string | undefined,
      artists: (data.artists || []).map((a: any) => ({ id: a.id as string, name: a.name as string })),
    }
    return NextResponse.json({ album })
  } catch (e: any) {
    return NextResponse.json({ album: null, error: e?.message || 'Spotify request failed' }, { status: 500 })
  }
}
