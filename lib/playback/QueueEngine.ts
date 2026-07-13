import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlaybackQueue } from './types'
import { getPlaylistSnapshot } from './PlaylistSnapshot'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

async function loadQueue(sb: SupabaseClient, queueId: string): Promise<PlaybackQueue | null> {
  const { data: queue } = await sb.from('playback_queues').select('*').eq('id', queueId).maybeSingle()
  if (!queue) return null

  const { data: items } = await sb
    .from('playback_queue_items')
    .select('position, playlist_snapshot_id, playlist_snapshots(name, track_count)')
    .eq('queue_id', queueId)
    .order('position', { ascending: true })

  const mappedItems = await Promise.all(
    (items || []).map(async row => {
      const snap = (row as { playlist_snapshots?: { name?: string; track_count?: number } }).playlist_snapshots
      const snapshotId = row.playlist_snapshot_id as string
      const full = snap ? null : await getPlaylistSnapshot(sb, snapshotId)
      return {
        snapshotId,
        snapshotName: snap?.name || full?.name || 'Playlist',
        position: row.position as number,
        trackCount: snap?.track_count ?? full?.trackCount ?? 0,
      }
    }),
  )

  return {
    id: String(queue.id),
    userId: String(queue.user_id),
    name: String(queue.name),
    status: queue.status as PlaybackQueue['status'],
    estimatedDurationSeconds: Number(queue.estimated_duration_seconds || 0),
    estimatedTrackCount: Number(queue.estimated_track_count || 0),
    items: mappedItems,
    createdAt: String(queue.created_at),
    startedAt: queue.started_at ? String(queue.started_at) : undefined,
    completedAt: queue.completed_at ? String(queue.completed_at) : undefined,
  }
}

export async function createPlaybackQueue(
  sb: SupabaseClient,
  userId: string,
  name: string,
  snapshotIds: string[],
): Promise<PlaybackQueue> {
  let totalTracks = 0
  let totalSeconds = 0
  for (const id of snapshotIds) {
    const snap = await getPlaylistSnapshot(sb, id)
    if (snap) {
      totalTracks += snap.trackCount
      totalSeconds += snap.totalDurationSeconds
    }
  }

  const { data: queue, error } = await sb
    .from('playback_queues')
    .insert({
      user_id: userId,
      name,
      estimated_track_count: totalTracks,
      estimated_duration_seconds: totalSeconds,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  for (let i = 0; i < snapshotIds.length; i++) {
    await sb.from('playback_queue_items').insert({
      queue_id: queue.id,
      playlist_snapshot_id: snapshotIds[i],
      position: i + 1,
    })
  }

  return (await loadQueue(sb, queue.id as string))!
}

export async function getPlaybackQueue(sb: SupabaseClient, queueId: string): Promise<PlaybackQueue | null> {
  return loadQueue(sb, queueId)
}

export async function addQueueItem(
  sb: SupabaseClient,
  queueId: string,
  snapshotId: string,
): Promise<PlaybackQueue> {
  const { count } = await sb
    .from('playback_queue_items')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', queueId)

  await sb.from('playback_queue_items').insert({
    queue_id: queueId,
    playlist_snapshot_id: snapshotId,
    position: (count || 0) + 1,
  })

  const snap = await getPlaylistSnapshot(sb, snapshotId)
  const { data: queue } = await sb.from('playback_queues').select('*').eq('id', queueId).maybeSingle()
  if (queue && snap) {
    await sb.from('playback_queues').update({
      estimated_track_count: Number(queue.estimated_track_count || 0) + snap.trackCount,
      estimated_duration_seconds: Number(queue.estimated_duration_seconds || 0) + snap.totalDurationSeconds,
    }).eq('id', queueId)
  }

  return (await loadQueue(sb, queueId))!
}

export async function startQueue(sb: SupabaseClient, queueId: string): Promise<PlaybackQueue> {
  const { error } = await sb
    .from('playback_queues')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', queueId)
  if (error) throw new Error(error.message)
  return (await loadQueue(sb, queueId))!
}

export async function finishQueue(sb: SupabaseClient, queueId: string): Promise<PlaybackQueue> {
  const { error } = await sb
    .from('playback_queues')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', queueId)
  if (error) throw new Error(error.message)
  return (await loadQueue(sb, queueId))!
}

export { formatDuration as formatQueueDuration }
