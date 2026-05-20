export type LastfmScrobble = {
  artist: string
  track: string
  album: string | null
  playedAt: Date
  url: string | null
  spotifyTrackId: string | null
}

const API_BASE = 'https://ws.audioscrobbler.com/2.0/'

function extractSpotifyTrackId(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex(p => p === 'track')
    if (idx >= 0 && parts[idx + 1] && /^[A-Za-z0-9]{22}$/.test(parts[idx + 1])) {
      return parts[idx + 1]
    }
  } catch {
    return null
  }
  return null
}

function parseScrobble(raw: Record<string, unknown>): LastfmScrobble | null {
  const artistObj = raw.artist as { '#text'?: string; name?: string } | string | undefined
  const artist =
    typeof artistObj === 'string'
      ? artistObj
      : artistObj?.['#text'] || artistObj?.name || ''
  const track = String(raw.name || '').trim()
  if (!artist.trim() || !track) return null

  const albumObj = raw.album as { '#text'?: string; name?: string } | string | undefined
  const album =
    typeof albumObj === 'string'
      ? albumObj
      : albumObj?.['#text'] || albumObj?.name || null

  const dateObj = raw.date as { uts?: string; '#text'?: string } | undefined
  const uts = dateObj?.uts ? parseInt(String(dateObj.uts), 10) : NaN
  const playedAt = Number.isFinite(uts) ? new Date(uts * 1000) : new Date()

  const url = raw.url ? String(raw.url) : null

  return {
    artist: artist.trim(),
    track,
    album: album?.trim() || null,
    playedAt,
    url,
    spotifyTrackId: extractSpotifyTrackId(url),
  }
}

export async function fetchLastfmRecentTracks(opts: {
  username: string
  from: Date
  to: Date
  apiKey: string
}): Promise<LastfmScrobble[]> {
  const fromTs = Math.floor(opts.from.getTime() / 1000)
  const toTs = Math.floor(opts.to.getTime() / 1000)
  const all: LastfmScrobble[] = []
  let page = 1
  const maxPages = 15

  while (page <= maxPages) {
    const sp = new URLSearchParams({
      method: 'user.getRecentTracks',
      user: opts.username,
      api_key: opts.apiKey,
      format: 'json',
      from: String(fromTs),
      to: String(toTs),
      limit: '200',
      page: String(page),
      extended: '1',
    })

    const res = await fetch(`${API_BASE}?${sp}`, { next: { revalidate: 0 } })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = (data as { message?: string }).message || `Last.fm ${res.status}`
      throw new Error(err)
    }

    const recenttracks = (data as { recenttracks?: Record<string, unknown> }).recenttracks
    if (!recenttracks) throw new Error('lastfm_invalid_response')

    const attr = recenttracks['@attr'] as { user?: string; totalPages?: string } | undefined
    const totalPages = parseInt(String(attr?.totalPages || '1'), 10) || 1

    let tracks = recenttracks.track
    if (!tracks) break
    if (!Array.isArray(tracks)) tracks = [tracks]

    for (const t of tracks as Record<string, unknown>[]) {
      if (t['@attr'] && (t['@attr'] as { nowplaying?: string }).nowplaying === 'true') continue
      const sc = parseScrobble(t)
      if (sc) all.push(sc)
    }

    if (page >= totalPages) break
    page += 1
  }

  return all.sort((a, b) => a.playedAt.getTime() - b.playedAt.getTime())
}

export function lastfmApiKey(): string | null {
  const key = process.env.LASTFM_API_KEY?.trim()
  return key || null
}
