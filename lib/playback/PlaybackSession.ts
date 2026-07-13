import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PlaybackSession,
  PlaybackSessionStatus,
  StartPlaybackSessionInput,
} from './types'

export function mapSessionRow(row: Record<string, unknown>): PlaybackSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    playlistSnapshotId: row.playlist_snapshot_id ? String(row.playlist_snapshot_id) : undefined,
    queueId: row.queue_id ? String(row.queue_id) : undefined,
    contextType: row.context_type as PlaybackSession['contextType'],
    contextId: row.context_id ? String(row.context_id) : undefined,
    platform: row.platform as PlaybackSession['platform'],
    status: row.status as PlaybackSessionStatus,
    startedAt: String(row.started_at),
    endedAt: row.ended_at ? String(row.ended_at) : undefined,
    expectedTrackCount: Number(row.expected_track_count || 0),
    matchedTrackCount: Number(row.matched_track_count || 0),
    completionRate: Number(row.completion_rate || 0),
    confidence: row.confidence as PlaybackSession['confidence'],
    metadata: (row.metadata as Record<string, unknown>) || undefined,
  }
}

export async function createPlaybackSession(
  sb: SupabaseClient,
  input: StartPlaybackSessionInput,
): Promise<PlaybackSession> {
  const { data, error } = await sb
    .from('playback_sessions')
    .insert({
      user_id: input.userId,
      playlist_snapshot_id: input.playlistSnapshotId || null,
      queue_id: input.queueId || null,
      context_type: input.contextType || null,
      context_id: input.contextId || null,
      platform: input.platform,
      status: 'started',
      expected_track_count: input.expectedTrackCount || 0,
      metadata: input.metadata || {},
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapSessionRow(data as Record<string, unknown>)
}

export async function getPlaybackSession(
  sb: SupabaseClient,
  sessionId: string,
): Promise<PlaybackSession | null> {
  const { data } = await sb.from('playback_sessions').select('*').eq('id', sessionId).maybeSingle()
  return data ? mapSessionRow(data as Record<string, unknown>) : null
}

export async function updatePlaybackSession(
  sb: SupabaseClient,
  sessionId: string,
  patch: Partial<{
    status: PlaybackSessionStatus
    endedAt: string
    matchedTrackCount: number
    completionRate: number
    confidence: PlaybackSession['confidence']
    metadata: Record<string, unknown>
  }>,
): Promise<PlaybackSession> {
  const row: Record<string, unknown> = {}
  if (patch.status) row.status = patch.status
  if (patch.endedAt) row.ended_at = patch.endedAt
  if (patch.matchedTrackCount != null) row.matched_track_count = patch.matchedTrackCount
  if (patch.completionRate != null) row.completion_rate = patch.completionRate
  if (patch.confidence) row.confidence = patch.confidence
  if (patch.metadata) row.metadata = patch.metadata

  const { data, error } = await sb
    .from('playback_sessions')
    .update(row)
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapSessionRow(data as Record<string, unknown>)
}

export async function listUserPlaybackSessions(
  sb: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<PlaybackSession[]> {
  const { data } = await sb
    .from('playback_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit)
  return (data || []).map(r => mapSessionRow(r as Record<string, unknown>))
}

export async function listContextPlaybackSessions(
  sb: SupabaseClient,
  contextType: string,
  contextId: string,
  limit = 50,
): Promise<PlaybackSession[]> {
  const { data } = await sb
    .from('playback_sessions')
    .select('*')
    .eq('context_type', contextType)
    .eq('context_id', contextId)
    .order('started_at', { ascending: false })
    .limit(limit)
  return (data || []).map(r => mapSessionRow(r as Record<string, unknown>))
}
