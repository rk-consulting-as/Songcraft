import { v2ServiceClient } from '@/lib/v2/apiAuth'
import { createPlaybackEngine } from '@/lib/playback/PlaybackEngine'
import { getLatestReport } from '@/lib/playback/PlaybackEvidence'
import { listContextPlaybackSessions } from '@/lib/playback/PlaybackSession'
import { PLAYBACK_LABELS, type PlaybackReport, type PlaybackSession } from '@/lib/playback/types'

export type PlaybackContextSummary = {
  available: boolean
  labels: typeof PLAYBACK_LABELS
  sessions: PlaybackSession[]
  report: PlaybackReport | null
  sessionCount: number
  highConfidenceCount: number
  averageCompletion: number
}

/** Read-only playback summary for community surfaces — via PlaybackEngine data layer. */
export async function fetchPlaybackContextSummary(
  contextType: 'v2_session' | 'v2_playlist_room' | 'song_page',
  contextId: string,
): Promise<PlaybackContextSummary> {
  const sb = v2ServiceClient()
  const empty: PlaybackContextSummary = {
    available: false,
    labels: PLAYBACK_LABELS,
    sessions: [],
    report: null,
    sessionCount: 0,
    highConfidenceCount: 0,
    averageCompletion: 0,
  }

  try {
    const sessions = await listContextPlaybackSessions(sb, contextType, contextId, 30)
    const completed = sessions.filter(s => s.status === 'completed')
    const report = await getLatestReport(sb, contextType, contextId)

    return {
      available: true,
      labels: PLAYBACK_LABELS,
      sessions: completed.slice(0, 5),
      report,
      sessionCount: completed.length,
      highConfidenceCount: completed.filter(s => s.confidence === 'high').length,
      averageCompletion: completed.length
        ? completed.reduce((s, x) => s + x.completionRate, 0) / completed.length
        : 0,
    }
  } catch {
    return empty
  }
}

export function createUserPlaybackEngine() {
  const sb = v2ServiceClient()
  return createPlaybackEngine(sb)
}

export async function fetchHostPlaybackReports(hostUserId: string, limit = 5): Promise<PlaybackReport[]> {
  const sb = v2ServiceClient()
  const { mapReportRow } = await import('@/lib/playback/PlaybackEvidence')

  const [{ data: sessions }, { data: roomRows }] = await Promise.all([
    sb.from('v2_sessions').select('id').eq('host_user_id', hostUserId),
    sb.from('v2_playlist_rooms').select('id').eq('owner_user_id', hostUserId),
  ])

  const sessionIds = (sessions || []).map(s => s.id as string)
  const roomIds = (roomRows || []).map(r => r.id as string)
  const reports: PlaybackReport[] = []

  if (sessionIds.length) {
    const { data } = await sb
      .from('playback_reports')
      .select('*')
      .eq('context_type', 'v2_session')
      .in('context_id', sessionIds)
      .order('generated_at', { ascending: false })
      .limit(limit)
    reports.push(...(data || []).map(r => mapReportRow(r as Record<string, unknown>)))
  }

  if (roomIds.length) {
    const { data } = await sb
      .from('playback_reports')
      .select('*')
      .eq('context_type', 'v2_playlist_room')
      .in('context_id', roomIds)
      .order('generated_at', { ascending: false })
      .limit(limit)
    reports.push(...(data || []).map(r => mapReportRow(r as Record<string, unknown>)))
  }

  return reports
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, limit)
}
