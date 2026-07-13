import type { SupabaseClient } from '@supabase/supabase-js'
import { createPlaybackEngine } from '@/lib/playback/PlaybackEngine'
import { getPlaylistSnapshot } from '@/lib/playback/PlaylistSnapshot'
import { diffPlaylistSnapshots } from '@/lib/playback/providers/spotify/playlistDiff'
import { SpotifyApiError } from '@/lib/spotify/userApi'
import {
  fetchUserPlaylistMetadata,
  fetchUserPlaylistTracks,
} from '@/lib/spotify/playlistApi'
import { touchSpotifySync } from '@/lib/spotify/connections'
import { extractSpotifyPlaylistId } from '@/lib/playlistCommunities/spotifyPlaylist'
import { scoreTrackMatch } from '@/lib/playback/PlaybackProviders'

export async function syncCuratorLinkedSpotifyPlaylist(
  sb: SupabaseClient,
  userId: string,
  linkedPlaylistId: string,
): Promise<{
  snapshotId: string
  diff: ReturnType<typeof diffPlaylistSnapshots>
  syncStatus: string
}> {
  const { data: linked, error } = await sb
    .from('v2_curator_linked_playlists')
    .select('*, v2_playlist_rooms(id, slug, name, owner_user_id)')
    .eq('id', linkedPlaylistId)
    .maybeSingle()

  if (error || !linked) throw new Error('linked_playlist_not_found')
  const room = (linked as { v2_playlist_rooms?: { id: string; owner_user_id: string } }).v2_playlist_rooms
  if (!room || room.owner_user_id !== userId) throw new Error('forbidden')

  const playlistId = linked.external_playlist_id || extractSpotifyPlaylistId(linked.playlist_url)
  if (!playlistId) throw new Error('spotify_playlist_id_missing')

  await sb.from('v2_curator_linked_playlists').update({ sync_status: 'syncing' }).eq('id', linkedPlaylistId)

  try {
    const [meta, tracks] = await Promise.all([
      fetchUserPlaylistMetadata(sb, userId, playlistId),
      fetchUserPlaylistTracks(sb, userId, playlistId),
    ])

    const previous = linked.latest_snapshot_id
      ? await getPlaylistSnapshot(sb, String(linked.latest_snapshot_id))
      : null

    const engine = createPlaybackEngine(sb)
    const snapshot = await engine.linkPlaylistSnapshot({
      platform: 'spotify',
      externalPlaylistId: playlistId,
      name: meta.title || linked.title || 'Spotify Playlist',
      description: meta.description || linked.description || undefined,
      coverImageUrl: meta.imageUrl || linked.cover_image_url || undefined,
      ownerUserId: userId,
      ownerDisplayName: meta.ownerName || undefined,
      tracks,
      linkedContextType: 'v2_playlist_room',
      linkedContextId: linked.room_id,
    })

    const diff = diffPlaylistSnapshots(previous, snapshot)
    const totalDuration = tracks.reduce((s, t) => s + (t.durationSeconds || 0), 0)

    await sb.from('v2_curator_linked_playlists').update({
      title: meta.title,
      description: meta.description,
      cover_image_url: meta.imageUrl,
      external_playlist_id: playlistId,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      last_sync_error: null,
      latest_snapshot_id: snapshot.id,
      track_count: tracks.length,
      total_duration_seconds: totalDuration,
    }).eq('id', linkedPlaylistId)

    await sb.from('v2_playlist_rooms').update({ current_snapshot_id: snapshot.id }).eq('id', linked.room_id)
    await touchSpotifySync(sb, userId)
    await applyPlaylistDiffToSubmissions(sb, linked.room_id, diff)

    return { snapshotId: snapshot.id, diff, syncStatus: 'synced' }
  } catch (e) {
    let syncStatus = 'failed'
    if (e instanceof SpotifyApiError) {
      if (e.status === 403) syncStatus = 'forbidden'
      else if (e.status === 401) syncStatus = 'needs_reconnect'
      else if (e.status === 429) syncStatus = 'stale'
    }
    await sb.from('v2_curator_linked_playlists').update({
      sync_status: syncStatus,
      last_sync_error: (e instanceof Error ? e.message : 'sync_failed').slice(0, 500),
    }).eq('id', linkedPlaylistId)
    throw e
  }
}

async function applyPlaylistDiffToSubmissions(
  sb: SupabaseClient,
  roomId: string,
  diff: ReturnType<typeof diffPlaylistSnapshots>,
): Promise<void> {
  if (!diff.added.length && !diff.removed.length) return

  const { data: items } = await sb
    .from('v2_playlist_room_items')
    .select('id, title, artist_name, status')
    .eq('room_id', roomId)
    .in('status', ['accepted', 'added_to_playlist', 'approved'])

  if (!items?.length) return

  for (const added of diff.added) {
    const match = items.find(item =>
      scoreTrackMatch(
        { title: String(item.title), artist: String(item.artist_name || '') },
        { title: added.title, artist: added.artistName },
      ) >= 0.95,
    )
    if (match && ['accepted', 'approved'].includes(String(match.status))) {
      await sb.from('v2_playlist_room_items').update({ status: 'added_to_playlist' }).eq('id', match.id)
    }
  }

  for (const removed of diff.removed) {
    const match = items.find(item =>
      scoreTrackMatch(
        { title: String(item.title), artist: String(item.artist_name || '') },
        { title: removed.title, artist: removed.artistName },
      ) >= 0.95,
    )
    if (match && match.status === 'added_to_playlist') {
      await sb.from('v2_playlist_room_items').update({ status: 'removed_from_playlist' }).eq('id', match.id)
    }
  }
}
