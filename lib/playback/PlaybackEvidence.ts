import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlaybackEvidence, PlaybackEvidenceInput, PlaybackReport } from './types'
import { aggregateSessionConfidence, countByConfidence } from './PlaybackScoring'
import { listSessionEvidence, mergeEvidence, persistEvidence } from './PlaylistSnapshot'
import { getPlaybackSession, listContextPlaybackSessions, updatePlaybackSession } from './PlaybackSession'

export async function collectAndPersistEvidence(
  engine: { collectSessionEvidence(sessionId: string): Promise<PlaybackEvidenceInput[]> },
  sb: SupabaseClient,
  sessionId: string,
): Promise<PlaybackEvidence[]> {
  const inputs = await engine.collectSessionEvidence(sessionId)
  return persistEvidence(sb, sessionId, inputs)
}

/** Finish session: collect evidence, score, update session row. */
export async function finishPlaybackSessionFlow(
  engine: { finishSession(sessionId: string): Promise<PlaybackEvidenceInput[]> },
  sb: SupabaseClient,
  sessionId: string,
): Promise<{ session: Awaited<ReturnType<typeof getPlaybackSession>>; evidence: PlaybackEvidence[] }> {
  const session = await getPlaybackSession(sb, sessionId)
  if (!session) throw new Error('session_not_found')

  await updatePlaybackSession(sb, sessionId, { status: 'collecting' })
  const inputs = await engine.finishSession(sessionId)
  const merged = mergeEvidence(inputs)
  const evidence = await persistEvidence(sb, sessionId, merged)

  const { confidence, completionRate, matchedCount } = aggregateSessionConfidence(
    merged,
    session.expectedTrackCount,
  )

  const updated = await updatePlaybackSession(sb, sessionId, {
    status: 'completed',
    endedAt: new Date().toISOString(),
    matchedTrackCount: matchedCount,
    completionRate,
    confidence,
  })

  return { session: updated, evidence }
}

export function evidenceToInputs(rows: PlaybackEvidence[]): PlaybackEvidenceInput[] {
  return rows.map(r => ({
    trackPosition: r.trackPosition,
    trackExternalId: r.trackExternalId,
    trackTitle: r.trackTitle,
    trackArtist: r.trackArtist,
    provider: r.provider,
    evidenceType: r.evidenceType,
    confidence: r.confidence,
    confidenceScore: r.confidenceScore,
    observedAt: r.observedAt,
    metadata: r.metadata,
  }))
}

export async function getSessionEvidenceSummary(
  sb: SupabaseClient,
  sessionId: string,
): Promise<{
  evidence: PlaybackEvidence[]
  counts: ReturnType<typeof countByConfidence>
}> {
  const evidence = await listSessionEvidence(sb, sessionId)
  const counts = countByConfidence(evidenceToInputs(evidence))
  return { evidence, counts }
}

export function mapReportRow(row: Record<string, unknown>): PlaybackReport {
  return {
    id: String(row.id),
    sessionId: row.session_id ? String(row.session_id) : undefined,
    queueId: row.queue_id ? String(row.queue_id) : undefined,
    playlistSnapshotId: row.playlist_snapshot_id ? String(row.playlist_snapshot_id) : undefined,
    contextType: row.context_type as PlaybackReport['contextType'],
    contextId: row.context_id ? String(row.context_id) : undefined,
    title: String(row.title),
    participantCount: Number(row.participant_count || 0),
    playbackSessionCount: Number(row.playback_session_count || 0),
    highConfidenceCount: Number(row.high_confidence_count || 0),
    mediumConfidenceCount: Number(row.medium_confidence_count || 0),
    lowConfidenceCount: Number(row.low_confidence_count || 0),
    songsCompleted: Number(row.songs_completed || 0),
    averageCompletionRate: Number(row.average_completion_rate || 0),
    feedbackCount: Number(row.feedback_count || 0),
    commentCount: Number(row.comment_count || 0),
    topSupporterUserId: row.top_supporter_user_id ? String(row.top_supporter_user_id) : undefined,
    topSupporterName: row.top_supporter_name ? String(row.top_supporter_name) : undefined,
    topSongTitle: row.top_song_title ? String(row.top_song_title) : undefined,
    topSongArtist: row.top_song_artist ? String(row.top_song_artist) : undefined,
    topArtistName: row.top_artist_name ? String(row.top_artist_name) : undefined,
    summary: (row.summary as Record<string, unknown>) || undefined,
    generatedAt: String(row.generated_at),
  }
}

/** Aggregate context sessions into a playback report row. */
export async function aggregateContextSessions(
  sb: SupabaseClient,
  opts: {
    contextType: string
    contextId: string
    title: string
    playlistSnapshotId?: string
    feedbackCount?: number
    commentCount?: number
  },
): Promise<PlaybackReport> {
  const sessions = await listContextPlaybackSessions(sb, opts.contextType, opts.contextId, 200)
  const completed = sessions.filter(s => s.status === 'completed')

  let high = 0
  let medium = 0
  let low = 0
  let songsCompleted = 0
  let completionSum = 0

  for (const s of completed) {
    if (s.confidence === 'high') high += 1
    else if (s.confidence === 'medium') medium += 1
    else if (s.confidence === 'low') low += 1
    songsCompleted += s.matchedTrackCount
    completionSum += s.completionRate
  }

  const participantCount = new Set(completed.map(s => s.userId)).size
  const avgCompletion = completed.length ? completionSum / completed.length : 0

  const { data, error } = await sb
    .from('playback_reports')
    .insert({
      context_type: opts.contextType,
      context_id: opts.contextId,
      playlist_snapshot_id: opts.playlistSnapshotId || null,
      title: opts.title,
      participant_count: participantCount,
      playback_session_count: completed.length,
      high_confidence_count: high,
      medium_confidence_count: medium,
      low_confidence_count: low,
      songs_completed: songsCompleted,
      average_completion_rate: avgCompletion,
      feedback_count: opts.feedbackCount || 0,
      comment_count: opts.commentCount || 0,
      summary: { sessionIds: completed.map(s => s.id) },
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapReportRow(data as Record<string, unknown>)
}

export async function getLatestReport(
  sb: SupabaseClient,
  contextType: string,
  contextId: string,
): Promise<PlaybackReport | null> {
  const { data } = await sb
    .from('playback_reports')
    .select('*')
    .eq('context_type', contextType)
    .eq('context_id', contextId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? mapReportRow(data as Record<string, unknown>) : null
}
