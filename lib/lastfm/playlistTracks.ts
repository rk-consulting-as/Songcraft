import { spotifyFetch } from '@/lib/spotify'

export type PlaylistTrackRef = {
  position: number
  spotifyId: string | null
  name: string
  artist: string
}

type SpotifyTrackItem = {
  track?: {
    id?: string
    name?: string
    artists?: { name?: string }[]
  } | null
}

export async function fetchSpotifyPlaylistTracks(playlistId: string, market = 'NO'): Promise<PlaylistTrackRef[]> {
  const tracks: PlaylistTrackRef[] = []
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100&market=${encodeURIComponent(market)}`
  let position = 0

  while (url) {
    const res = await spotifyFetch(url)
    if (!res.ok) {
      let detail = ''
      try {
        detail = (await res.json())?.error?.message || ''
      } catch {
        /* ignore */
      }
      throw new Error(`spotify_playlist_tracks_${res.status}${detail ? `: ${detail}` : ''}`)
    }
    const data = await res.json()
    const items = (data.items || []) as SpotifyTrackItem[]
    for (const item of items) {
      const tr = item.track
      if (!tr?.name) continue
      position += 1
      tracks.push({
        position,
        spotifyId: tr.id || null,
        name: tr.name,
        artist: (tr.artists || []).map(a => a.name).filter(Boolean).join(', ') || 'Unknown',
      })
    }
    url = data.next || null
  }

  return tracks
}
