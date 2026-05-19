const PLAYLIST_ID_RE = /^[A-Za-z0-9]{22}$/

export function extractSpotifyPlaylistId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (PLAYLIST_ID_RE.test(raw)) return raw

  const uriMatch = /^spotify:playlist:([A-Za-z0-9]{22})$/i.exec(raw)
  if (uriMatch) return uriMatch[1]

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    if (!/^open\.spotify\.com$|spotify\.link$/i.test(url.hostname)) return null
    const segments = url.pathname.split('/').filter(Boolean)
    const idx = segments.findIndex(s => s.toLowerCase() === 'playlist')
    if (idx >= 0 && segments[idx + 1] && PLAYLIST_ID_RE.test(segments[idx + 1])) {
      return segments[idx + 1]
    }
  } catch {
    return null
  }
  return null
}

export function normalizeSpotifyPlaylistUrl(input: string, id?: string | null): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('http')) return trimmed.split('?')[0] || trimmed
  const pid = id || extractSpotifyPlaylistId(trimmed)
  if (pid) return `https://open.spotify.com/playlist/${pid}`
  return trimmed
}

export type SpotifyPlaylistMeta = {
  id: string
  title: string
  description: string | null
  spotifyUrl: string
  imageUrl: string | null
  ownerName: string | null
}

export function mapSpotifyPlaylist(data: Record<string, unknown>): SpotifyPlaylistMeta {
  const id = String(data.id || '')
  const images = (data.images as { url?: string }[]) || []
  const owner = data.owner as { display_name?: string } | undefined
  return {
    id,
    title: String(data.name || ''),
    description: (data.description as string) || null,
    spotifyUrl: String((data.external_urls as { spotify?: string })?.spotify || normalizeSpotifyPlaylistUrl('', id)),
    imageUrl: images[0]?.url || null,
    ownerName: owner?.display_name || null,
  }
}
