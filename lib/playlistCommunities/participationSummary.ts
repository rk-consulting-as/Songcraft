import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildParticipationBoard,
  formatDateYmd,
  getWeekDates,
} from './participationBoard'
import type { CampaignActivityLog } from './activityTypes'

export type CampaignParticipationStats = {
  pendingProofCount: number
  approvedThisWeek: number
  membersNeedingAttention: number
  weekComplete: boolean
}

export type UserParticipationSummary = {
  pendingReviews: number
  membersNeedingAttention: number
  myPendingSubmissions: number
  joinedNeedingProofToday: number
  weekCompletionPercent: number
  weekApprovedCount: number
  weekExpectedDays: number
  hostedActiveCampaignCount: number
  activityProofSubmitCount: number
  approvedActivityProofCount: number
  hasCompletedCampaignWeek: boolean
  campaignStats: Record<string, CampaignParticipationStats>
  reviewCampaignId: string | null
  proofTodayCampaignId: string | null
}

export async function fetchUserParticipationSummary(
  sb: SupabaseClient,
  userId: string
): Promise<UserParticipationSummary> {
  const today = formatDateYmd(new Date())
  const weekDates = getWeekDates()

  const [
    { data: ownedCampaigns },
    { data: memberships },
    { count: activityProofSubmitCount },
    { count: approvedActivityProofCount },
  ] = await Promise.all([
    sb.from('playlist_campaigns').select('id, status, active_days_per_week').eq('user_id', userId),
    sb
      .from('playlist_campaign_members')
      .select('id, campaign_id, status')
      .eq('user_id', userId)
      .eq('status', 'approved'),
    sb
      .from('campaign_activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['submitted', 'pending', 'approved']),
    sb
      .from('campaign_activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved'),
  ])

  const ownedIds = (ownedCampaigns || []).map(c => c.id)
  const memberCampaignIds = (memberships || []).map(m => m.campaign_id)
  const allCampaignIds = Array.from(new Set([...ownedIds, ...memberCampaignIds]))

  let logs: CampaignActivityLog[] = []
  if (allCampaignIds.length) {
    const { data } = await sb
      .from('campaign_activity_logs')
      .select('*')
      .in('campaign_id', allCampaignIds)
    logs = (data || []) as CampaignActivityLog[]
  }

  const weekSet = new Set(weekDates)
  const weekLogs = logs.filter(l => weekSet.has(l.activity_date))

  const pendingReviews = logs.filter(
    l => ownedIds.includes(l.campaign_id) && (l.status === 'submitted' || l.status === 'pending')
  ).length

  const myPendingSubmissions = logs.filter(
    l => l.user_id === userId && (l.status === 'submitted' || l.status === 'pending')
  ).length

  const todayLog = logs.find(l => l.user_id === userId && l.activity_date === today)
  const joinedNeedingProofToday =
    (memberships || []).length > 0 &&
    (!todayLog || !['submitted', 'approved', 'pending'].includes(todayLog.status))
      ? 1
      : 0

  const proofTodayCampaignId =
    joinedNeedingProofToday && memberships?.[0]
      ? memberships.find(m => {
          const hasToday = logs.some(
            l => l.member_id === m.id && l.activity_date === today && l.status !== 'missed'
          )
          return !hasToday
        })?.campaign_id || memberships[0].campaign_id
      : null

  const reviewCampaignId =
    ownedIds.find(id =>
      logs.some(
        l => l.campaign_id === id && (l.status === 'submitted' || l.status === 'pending')
      )
    ) || null

  const campaignStats: Record<string, CampaignParticipationStats> = {}
  let membersNeedingAttention = 0

  let allApprovedMembers: { id: string; campaign_id: string }[] = []
  if (ownedIds.length) {
    const { data } = await sb
      .from('playlist_campaign_members')
      .select('id, campaign_id')
      .in('campaign_id', ownedIds)
      .eq('status', 'approved')
    allApprovedMembers = data || []
  }

  for (const campaignId of ownedIds) {
    const campaignLogs = logs.filter(l => l.campaign_id === campaignId)
    const weekCampaignLogs = campaignLogs.filter(l => weekSet.has(l.activity_date))
    const pendingProofCount = campaignLogs.filter(
      l => l.status === 'submitted' || l.status === 'pending'
    ).length
    const approvedThisWeek = weekCampaignLogs.filter(l => l.status === 'approved').length

    const members = allApprovedMembers.filter(m => m.campaign_id === campaignId)
    const board = buildParticipationBoard(
      members.map(m => ({ id: m.id, artistName: null, songTitle: null, songHref: null })),
      campaignLogs,
      weekDates,
      today
    )
    const attention = board.filter(
      b => b.currentStatus === 'needs_attention' || b.pendingCount > 0
    ).length
    membersNeedingAttention += attention

    campaignStats[campaignId] = {
      pendingProofCount,
      approvedThisWeek,
      membersNeedingAttention: attention,
      weekComplete: board.length > 0 && board.every(b => b.weekComplete),
    }
  }

  const hostedActiveCampaignCount = (ownedCampaigns || []).filter(
    c => ['open', 'active'].includes(c.status) && (campaignStats[c.id]?.approvedThisWeek || 0) > 0
  ).length

  const weekApprovedCount = weekLogs.filter(
    l => l.user_id === userId && l.status === 'approved'
  ).length
  const weekExpectedDays =
    (ownedCampaigns || []).find(c => ownedIds.includes(c.id))?.active_days_per_week || 5
  const weekCompletionPercent = weekExpectedDays
    ? Math.min(100, Math.round((weekApprovedCount / weekExpectedDays) * 100))
    : 0

  let hasCompletedCampaignWeek = false
  for (const m of memberships || []) {
    const memberLogs = logs.filter(l => l.member_id === m.id)
    const board = buildParticipationBoard(
      [{ id: m.id, artistName: null, songTitle: null, songHref: null }],
      memberLogs,
      weekDates,
      today
    )
    if (board[0]?.weekComplete) {
      hasCompletedCampaignWeek = true
      break
    }
  }

  return {
    pendingReviews,
    membersNeedingAttention,
    myPendingSubmissions,
    joinedNeedingProofToday,
    weekCompletionPercent,
    weekApprovedCount,
    weekExpectedDays,
    hostedActiveCampaignCount,
    activityProofSubmitCount: activityProofSubmitCount || 0,
    approvedActivityProofCount: approvedActivityProofCount || 0,
    hasCompletedCampaignWeek,
    campaignStats,
    reviewCampaignId,
    proofTodayCampaignId,
  }
}
