import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchUserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'
import { fetchParticipationStreaks } from './streaks'
import { fetchPendingSuggestions } from './suggestions'
import type { ParticipationWidgetStats } from './types'

export async function fetchParticipationWidgetStats(
  sb: SupabaseClient,
  userId: string
): Promise<ParticipationWidgetStats> {
  const [streaks, summary, pending] = await Promise.all([
    fetchParticipationStreaks(sb, userId),
    fetchUserParticipationSummary(sb, userId),
    fetchPendingSuggestions(sb, userId, 50),
  ])

  const stats = Object.values(summary.campaignStats || {})
  const avgCampaignCompletionPercent =
    stats.length > 0
      ? Math.round(
          stats.reduce((s, c) => s + (c.weekComplete ? 100 : summary.weekCompletionPercent), 0) / stats.length
        )
      : summary.weekCompletionPercent

  const { count: joinedCount } = await sb
    .from('playlist_campaign_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'approved')

  return {
    streaks,
    weekCompletionPercent: summary.weekCompletionPercent,
    weekApprovedCount: summary.weekApprovedCount,
    pendingSuggestions: pending.length,
    pendingOwnerReviews: summary.pendingReviews,
    avgCampaignCompletionPercent,
    activeCampaignCount: joinedCount || 0,
  }
}
