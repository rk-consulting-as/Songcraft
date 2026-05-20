import type { SupabaseClient } from '@supabase/supabase-js'
import { getWeekDates } from '@/lib/playlistCommunities/participationBoard'
import type { CampaignHealthScore } from './types'

const CONF_WEIGHT: Record<string, number> = {
  high: 1,
  medium: 0.65,
  low: 0.35,
  unclear: 0.1,
}

export async function computePassiveCampaignHealthScore(
  sb: SupabaseClient,
  campaignId: string,
  ownerUserId: string
): Promise<CampaignHealthScore> {
  const weekDates = getWeekDates()

  const [{ data: members }, { data: logs }, { data: suggestions }] = await Promise.all([
    sb
      .from('playlist_campaign_members')
      .select('id, status')
      .eq('campaign_id', campaignId)
      .eq('status', 'approved'),
    sb
      .from('campaign_activity_logs')
      .select('status, activity_date, ai_confidence, member_id')
      .eq('campaign_id', campaignId),
    sb
      .from('campaign_activity_suggestions')
      .select('confidence, status')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending'),
  ])

  const approved = members || []
  const memberCount = approved.length
  const weekSet = new Set(weekDates)

  const weekLogs = (logs || []).filter(l => weekSet.has(l.activity_date))
  const approvedWeek = weekLogs.filter(l => l.status === 'approved').length
  const submittedWeek = weekLogs.filter(l => ['submitted', 'approved', 'pending'].includes(l.status)).length
  const missedWeek = weekLogs.filter(l => l.status === 'missed' || l.status === 'rejected').length

  const activeMemberIds = new Set(
    weekLogs
      .filter(l => ['submitted', 'approved', 'pending'].includes(l.status) && l.member_id)
      .map(l => l.member_id as string)
  )

  const proofConsistency =
    memberCount > 0 ? Math.min(100, Math.round((approvedWeek / Math.max(1, memberCount * 3)) * 100)) : 0

  const confLogs = (logs || []).filter(l => l.ai_confidence && l.status === 'approved')
  const confAvg =
    confLogs.length > 0
      ? confLogs.reduce((s, l) => s + (CONF_WEIGHT[l.ai_confidence as string] || 0.5), 0) / confLogs.length
      : 0.5
  const confidenceQuality = Math.round(confAvg * 100)

  const missedActivity = memberCount > 0 ? Math.round((missedWeek / Math.max(1, memberCount)) * 100) : 0

  const participationFrequency =
    memberCount > 0 ? Math.min(100, Math.round((submittedWeek / Math.max(1, memberCount * weekDates.length)) * 100)) : 0

  const activeMemberScore =
    memberCount > 0 ? Math.min(100, Math.round((activeMemberIds.size / memberCount) * 100)) : 0

  const pendingBoost = Math.min(10, (suggestions || []).length * 2)

  const raw =
    activeMemberScore * 0.25 +
    proofConsistency * 0.25 +
    confidenceQuality * 0.2 +
    (100 - missedActivity) * 0.15 +
    participationFrequency * 0.15 +
    pendingBoost

  const score = Math.max(0, Math.min(100, Math.round(raw)))

  let labelKey = 'campaignHealthFair'
  if (score >= 75) labelKey = 'campaignHealthStrong'
  else if (score >= 50) labelKey = 'campaignHealthFair'
  else labelKey = 'campaignHealthNeedsAttention'

  return {
    score,
    labelKey,
    factors: {
      activeMembers: activeMemberScore,
      proofConsistency,
      confidenceQuality,
      missedActivity,
      participationFrequency,
    },
  }
}
