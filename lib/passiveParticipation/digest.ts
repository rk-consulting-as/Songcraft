import type { SupabaseClient } from '@supabase/supabase-js'
import { getWeekDates } from '@/lib/playlistCommunities/participationBoard'
import { fetchParticipationStreaks } from './streaks'
import type { PassiveParticipationDigest } from './types'

export async function fetchWeeklyParticipationDigest(
  sb: SupabaseClient,
  userId: string
): Promise<PassiveParticipationDigest> {
  const weekDates = getWeekDates()
  const weekStart = weekDates[0]
  const weekEnd = weekDates[weekDates.length - 1]
  const weekSet = new Set(weekDates)

  const [{ data: suggestions }, { data: logs }, streaks] = await Promise.all([
    sb
      .from('campaign_activity_suggestions')
      .select('status, campaign_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', `${weekStart}T00:00:00Z`),
    sb
      .from('campaign_activity_logs')
      .select('status, campaign_id, activity_date')
      .eq('user_id', userId),
    fetchParticipationStreaks(sb, userId),
  ])

  const weekLogs = (logs || []).filter(l => weekSet.has(l.activity_date))
  const proofsApproved = weekLogs.filter(l => l.status === 'approved').length
  const campaignsParticipated = new Set(weekLogs.map(l => l.campaign_id)).size

  const weekSug = suggestions || []
  const sessionsDetected = weekSug.length
  const suggestionsApproved = weekSug.filter(s => s.status === 'approved').length
  const suggestionsIgnored = weekSug.filter(s => s.status === 'ignored').length

  let reputationNote = 'passiveDigestReputationNone'
  if (streaks.dailyCurrent >= 7 || streaks.weeklyCurrent >= 4) {
    reputationNote = 'passiveDigestReputationStrong'
  } else if (proofsApproved >= 3 || suggestionsApproved >= 2) {
    reputationNote = 'passiveDigestReputationGood'
  } else if (sessionsDetected > 0) {
    reputationNote = 'passiveDigestReputationDetected'
  }

  return {
    weekStart,
    weekEnd,
    sessionsDetected,
    proofsApproved,
    campaignsParticipated,
    suggestionsApproved,
    suggestionsIgnored,
    reputationNote,
  }
}
