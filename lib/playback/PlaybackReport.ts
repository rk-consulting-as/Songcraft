import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlaybackEvidenceInput, PlaybackReport, PlaylistSnapshot } from './types'
import { aggregateContextSessions, evidenceToInputs, mapReportRow } from './PlaybackEvidence'
import { aggregateSessionConfidence, countByConfidence } from './PlaybackScoring'
import { getPlaylistSnapshot } from './PlaylistSnapshot'
import { getPlaybackSession, listContextPlaybackSessions } from './PlaybackSession'
import { listSessionEvidence } from './PlaylistSnapshot'

export type GenerateReportInput = {
  sessionId?: string
  queueId?: string
  contextType?: string
  contextId?: string
  title: string
  playlistSnapshotId?: string
  feedbackCount?: number
  commentCount?: number
}

/** Generate report for a single completed session. */
export async function generateSessionReport(
  sb: SupabaseClient,
  sessionId: string,
  title?: string,
): Promise<PlaybackReport> {
  const session = await getPlaybackSession(sb, sessionId)
  if (!session) throw new Error('session_not_found')

  const evidence = await listSessionEvidence(sb, sessionId)
  const inputs = evidenceToInputs(evidence)
  const counts = countByConfidence(inputs)

  const { data, error } = await sb
    .from('playback_reports')
    .insert({
      session_id: sessionId,
      playlist_snapshot_id: session.playlistSnapshotId || null,
      context_type: session.contextType || null,
      context_id: session.contextId || null,
      title: title || 'Playback Evidence Report',
      participant_count: 1,
      playback_session_count: 1,
      high_confidence_count: counts.high,
      medium_confidence_count: counts.medium,
      low_confidence_count: counts.low,
      songs_completed: session.matchedTrackCount,
      average_completion_rate: session.completionRate,
      summary: {
        confidence: session.confidence,
        evidenceCount: evidence.length,
      },
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapReportRow(data as Record<string, unknown>)
}

/** Generate aggregated report for a queue or community context. */
export async function generatePlaybackReport(
  sb: SupabaseClient,
  input: GenerateReportInput,
): Promise<PlaybackReport> {
  if (input.sessionId) {
    return generateSessionReport(sb, input.sessionId, input.title)
  }

  if (input.contextType && input.contextId) {
    return aggregateContextSessions(sb, {
      contextType: input.contextType,
      contextId: input.contextId,
      title: input.title,
      playlistSnapshotId: input.playlistSnapshotId,
      feedbackCount: input.feedbackCount,
      commentCount: input.commentCount,
    })
  }

  throw new Error('invalid_report_input')
}

/** Preview report stats without persisting. */
export async function previewReportStats(
  sb: SupabaseClient,
  sessionId: string,
): Promise<{
  title: string
  snapshot?: PlaylistSnapshot
  high: number
  medium: number
  low: number
  completionRate: number
  confidence: string
}> {
  const session = await getPlaybackSession(sb, sessionId)
  if (!session) throw new Error('session_not_found')

  const evidence = await listSessionEvidence(sb, sessionId)
  const inputs = evidenceToInputs(evidence)
  const counts = countByConfidence(inputs)
  const snapshot = session.playlistSnapshotId
    ? await getPlaylistSnapshot(sb, session.playlistSnapshotId)
    : undefined

  return {
    title: snapshot?.name || 'Listening Session',
    snapshot: snapshot || undefined,
    high: counts.high,
    medium: counts.medium,
    low: counts.low,
    completionRate: session.completionRate,
    confidence: session.confidence,
  }
}

/** Top supporter from completed context sessions (by session count). */
export async function topSupporterForContext(
  sb: SupabaseClient,
  contextType: string,
  contextId: string,
): Promise<{ userId: string; sessionCount: number } | null> {
  const sessions = await listContextPlaybackSessions(sb, contextType, contextId, 500)
  const counts = new Map<string, number>()
  for (const s of sessions.filter(x => x.status === 'completed')) {
    counts.set(s.userId, (counts.get(s.userId) || 0) + 1)
  }
  let best: { userId: string; sessionCount: number } | null = null
  for (const [userId, sessionCount] of Array.from(counts.entries())) {
    if (!best || sessionCount > best.sessionCount) best = { userId, sessionCount }
  }
  return best
}

export function buildReportFromEvidence(
  title: string,
  inputs: PlaybackEvidenceInput[],
  expectedTracks: number,
): Omit<PlaybackReport, 'id' | 'generatedAt'> {
  const counts = countByConfidence(inputs)
  const { confidence, completionRate, matchedCount } = aggregateSessionConfidence(inputs, expectedTracks)
  return {
    title,
    participantCount: 0,
    playbackSessionCount: 1,
    highConfidenceCount: counts.high,
    mediumConfidenceCount: counts.medium,
    lowConfidenceCount: counts.low,
    songsCompleted: matchedCount,
    averageCompletionRate: completionRate,
    feedbackCount: 0,
    commentCount: 0,
    summary: { confidence },
  }
}
