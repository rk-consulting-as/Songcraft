import type { SupabaseClient } from '@supabase/supabase-js'
import { getPlaylistSnapshot } from '@/lib/playback/PlaylistSnapshot'
import { persistEvidence } from '@/lib/playback/PlaylistSnapshot'
import {
  matchesToEvidenceInputs,
  matchRecentlyPlayedToSnapshot,
  scoreSpotifyMatchCoverage,
  type SpotifyMatchResult,
} from '@/lib/playback/providers/spotify/matchTracks'
import { getPlaybackSession } from '@/lib/playback/PlaybackSession'
import { fetchUserRecentlyPlayed, persistRecentlyPlayedDedup } from '@/lib/spotify/playlistApi'
import { getSpotifyConnectionRow } from '@/lib/spotify/connections'
import { touchSpotifySync } from '@/lib/spotify/connections'
import { isSpotifyOAuthEnabled } from '@/lib/spotify/config'

export type SpotifyPendingEvidence = {
  id: string
  sessionId?: string
  status: string
  matches: SpotifyMatchResult[]
  coverage: number
  confidence: string
  windowStart?: string
  windowEnd?: string
}

export async function syncAndMatchSpotifySession(
  sb: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<SpotifyPendingEvidence | null> {
  if (!isSpotifyOAuthEnabled()) return null
  const conn = await getSpotifyConnectionRow(sb, userId)
  if (!conn || conn.connection_status !== 'connected') return null

  const session = await getPlaybackSession(sb, sessionId)
  if (!session || session.userId !== userId) return null

  const snapshot = session.playlistSnapshotId
    ? await getPlaylistSnapshot(sb, session.playlistSnapshotId)
    : null

  const recent = await fetchUserRecentlyPlayed(sb, userId, 50)
  await persistRecentlyPlayedDedup(sb, userId, recent)
  await touchSpotifySync(sb, userId)

  const window = { start: session.startedAt, end: session.endedAt || new Date().toISOString() }
  const matches = snapshot?.tracks?.length
    ? matchRecentlyPlayedToSnapshot(snapshot.tracks, recent, window)
    : matchRecentlyPlayedToSnapshot(
      recent.map((r, i) => ({
        position: i + 1,
        externalTrackId: r.trackId,
        title: r.title,
        artistName: r.artist,
      })),
      recent,
      window,
    )

  const { coverage, confidence } = scoreSpotifyMatchCoverage(snapshot?.trackCount || matches.length, matches)

  const { data, error } = await sb
    .from('v2_spotify_evidence_pending')
    .upsert({
      user_id: userId,
      session_id: sessionId,
      playlist_snapshot_id: snapshot?.id || null,
      status: 'pending_review',
      matched_tracks: matches,
      coverage_rate: coverage,
      confidence,
      window_start: window.start,
      window_end: window.end,
      metadata: { disclaimer: 'spotify_recently_played_not_playlist_proof' },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' })
    .select('*')
    .single()

  if (error) {
    const { data: inserted } = await sb
      .from('v2_spotify_evidence_pending')
      .insert({
        user_id: userId,
        session_id: sessionId,
        playlist_snapshot_id: snapshot?.id || null,
        status: 'pending_review',
        matched_tracks: matches,
        coverage_rate: coverage,
        confidence,
        window_start: window.start,
        window_end: window.end,
      })
      .select('*')
      .single()
    if (!inserted) return null
    return mapPending(inserted as Record<string, unknown>)
  }

  return mapPending(data as Record<string, unknown>)
}

function mapPending(row: Record<string, unknown>): SpotifyPendingEvidence {
  return {
    id: String(row.id),
    sessionId: row.session_id ? String(row.session_id) : undefined,
    status: String(row.status),
    matches: (row.matched_tracks as SpotifyMatchResult[]) || [],
    coverage: Number(row.coverage_rate || 0),
    confidence: String(row.confidence || 'unknown'),
    windowStart: row.window_start ? String(row.window_start) : undefined,
    windowEnd: row.window_end ? String(row.window_end) : undefined,
  }
}

export async function getPendingSpotifyEvidence(
  sb: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<SpotifyPendingEvidence | null> {
  const { data } = await sb
    .from('v2_spotify_evidence_pending')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .maybeSingle()
  return data ? mapPending(data as Record<string, unknown>) : null
}

export async function submitSpotifyEvidence(
  sb: SupabaseClient,
  userId: string,
  pendingId: string,
  action: 'submit' | 'keep_private' | 'dismiss',
): Promise<{ submitted: boolean }> {
  const { data: pending } = await sb
    .from('v2_spotify_evidence_pending')
    .select('*')
    .eq('id', pendingId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!pending) throw new Error('pending_not_found')
  const row = pending as Record<string, unknown>
  const sessionId = row.session_id ? String(row.session_id) : ''
  const matches = (row.matched_tracks as SpotifyMatchResult[]) || []

  if (action === 'dismiss') {
    await sb.from('v2_spotify_evidence_pending').update({ status: 'dismissed' }).eq('id', pendingId)
    return { submitted: false }
  }

  if (action === 'keep_private') {
    await sb.from('v2_spotify_evidence_pending').update({ status: 'kept_private' }).eq('id', pendingId)
    return { submitted: false }
  }

  if (sessionId && matches.length) {
    const inputs = matchesToEvidenceInputs(matches)
    await persistEvidence(sb, sessionId, inputs)
  }

  await sb.from('v2_spotify_evidence_pending').update({ status: 'submitted' }).eq('id', pendingId)
  return { submitted: true }
}

export async function listUserSpotifyEvidenceStats(sb: SupabaseClient, userId: string) {
  const { count: submitted } = await sb
    .from('v2_spotify_evidence_pending')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'submitted')

  const conn = await getSpotifyConnectionRow(sb, userId)
  return {
    connected: conn?.connection_status === 'connected',
    submittedMatches: submitted || 0,
    lastSyncAt: conn?.last_sync_at || undefined,
  }
}
