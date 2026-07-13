import type { SupabaseClient } from '@supabase/supabase-js'
import { extractSpotifyPlaylistId, mapSpotifyPlaylist, type SpotifyPlaylistMeta } from '@/lib/playlistCommunities/spotifyPlaylist'
import type { PlaylistSnapshotTrack } from '@/lib/playback/types'
import { parseSpotifyError, spotifyUserFetch } from './userApi'

export type SpotifyUserPlaylist = SpotifyPlaylistMeta & {
  trackCount: number
  collaborative: boolean
  ownerId?: string
  public: boolean
}

export type SpotifyRecentlyPlayedItem = {
  playedAt: string
  trackId: string
  trackUri: string
  isrc?: string
  title: string
  artist: string
  album?: string
  durationMs?: number
}

export async function fetchUserSpotifyPlaylists(
  sb: SupabaseClient,
  userId: string,
  opts?: { search?: string; limit?: number },
): Promise<SpotifyUserPlaylist[]> {
  const limit = opts?.limit || 50
  const res = await spotifyUserFetch(sb, userId, `https://api.spotify.com/v1/me/playlists?limit=${limit}`)
  if (!res.ok) await parseSpotifyError(res)
  const data = await res.json()
  let items = ((data.items || []) as Record<string, unknown>[]).map(row => {
    const meta = mapSpotifyPlaylist(row)
    const owner = row.owner as { id?: string } | undefined
    return {
      ...meta,
      trackCount: Number((row.tracks as { total?: number })?.total || 0),
      collaborative: !!row.collaborative,
      ownerId: owner?.id,
      public: !!row.public,
    }
  })
  if (opts?.search?.trim()) {
    const q = opts.search.toLowerCase()
    items = items.filter(p => p.title.toLowerCase().includes(q))
  }
  return items
}

export async function fetchUserPlaylistMetadata(
  sb: SupabaseClient,
  userId: string,
  playlistIdOrUrl: string,
): Promise<SpotifyPlaylistMeta & { snapshotId?: string }> {
  const id = extractSpotifyPlaylistId(playlistIdOrUrl) || playlistIdOrUrl
  const res = await spotifyUserFetch(sb, userId, `https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}`)
  if (!res.ok) await parseSpotifyError(res)
  const data = await res.json()
  return { ...mapSpotifyPlaylist(data), snapshotId: data.snapshot_id ? String(data.snapshot_id) : undefined }
}

export async function fetchUserPlaylistTracks(
  sb: SupabaseClient,
  userId: string,
  playlistId: string,
  market = 'NO',
): Promise<PlaylistSnapshotTrack[]> {
  const tracks: PlaylistSnapshotTrack[] = []
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100&market=${encodeURIComponent(market)}&additional_types=track`
  let position = 0

  while (url) {
    const res = await spotifyUserFetch(sb, userId, url)
    if (!res.ok) await parseSpotifyError(res)
    const data = await res.json()
    for (const item of (data.items || []) as Array<{ added_at?: string; track?: Record<string, unknown> | null }>) {
      const tr = item.track
      if (!tr || tr.type === 'episode') continue
      const artists = (tr.artists as { name?: string }[]) || []
      const album = tr.album as { name?: string } | undefined
      const externalIds = tr.external_ids as { isrc?: string } | undefined
      position += 1
      tracks.push({
        position,
        externalTrackId: tr.id ? String(tr.id) : undefined,
        title: String(tr.name || 'Unknown'),
        artistName: artists.map(a => a.name).filter(Boolean).join(', ') || 'Unknown',
        durationSeconds: tr.duration_ms ? Math.round(Number(tr.duration_ms) / 1000) : undefined,
        album: album?.name,
        isrc: externalIds?.isrc,
      })
    }
    url = data.next || null
  }

  return tracks
}

export async function fetchUserRecentlyPlayed(
  sb: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<SpotifyRecentlyPlayedItem[]> {
  const res = await spotifyUserFetch(
    sb,
    userId,
    `https://api.spotify.com/v1/me/player/recently-played?limit=${Math.min(limit, 50)}`,
  )
  if (!res.ok) await parseSpotifyError(res)
  const data = await res.json()
  return ((data.items || []) as Array<{ played_at: string; track: Record<string, unknown> }>).map(item => {
    const tr = item.track
    const artists = (tr.artists as { name?: string }[]) || []
    const album = tr.album as { name?: string } | undefined
    const externalIds = tr.external_ids as { isrc?: string } | undefined
    return {
      playedAt: item.played_at,
      trackId: String(tr.id || ''),
      trackUri: String(tr.uri || ''),
      isrc: externalIds?.isrc,
      title: String(tr.name || ''),
      artist: artists.map(a => a.name).filter(Boolean).join(', ') || 'Unknown',
      album: album?.name,
      durationMs: tr.duration_ms ? Number(tr.duration_ms) : undefined,
    }
  }).filter(r => r.trackId)
}

export async function persistRecentlyPlayedDedup(
  sb: SupabaseClient,
  userId: string,
  items: SpotifyRecentlyPlayedItem[],
): Promise<SpotifyRecentlyPlayedItem[]> {
  const inserted: SpotifyRecentlyPlayedItem[] = []
  for (const item of items) {
    const { error } = await sb.from('v2_spotify_play_dedup').insert({
      user_id: userId,
      spotify_track_id: item.trackId,
      played_at: item.playedAt,
      track_uri: item.trackUri,
      isrc: item.isrc || null,
      track_title: item.title,
      track_artist: item.artist,
      album_name: item.album || null,
      duration_ms: item.durationMs || null,
    })
    if (!error) inserted.push(item)
  }
  return inserted
}
