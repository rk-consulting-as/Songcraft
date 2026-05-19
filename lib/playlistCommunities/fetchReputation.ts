import { createClient } from '@/lib/supabase'
import { computePlaylistReputation, type PlaylistReputationBadge } from './reputation'

export async function fetchUserPlaylistReputation(userId: string): Promise<PlaylistReputationBadge[]> {
  const sb = createClient()

  const [
    { count: playlistCount },
    { count: ownedCampaignCount },
    { data: memberships },
    { data: ownedCampaigns },
    { count: approvedActivityCount },
    { count: participationSubmitCount },
  ] = await Promise.all([
    sb.from('creator_playlists').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('playlist_campaigns').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('playlist_campaign_members').select('id, status, campaign_id').eq('user_id', userId),
    sb.from('playlist_campaigns').select('id').eq('user_id', userId),
    sb
      .from('campaign_activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved'),
    sb
      .from('campaign_activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['submitted', 'approved', 'pending']),
  ])

  const approvedMembershipCount = (memberships || []).filter(m => m.status === 'approved').length
  const joinedCampaignCount = (memberships || []).filter(m =>
    ['requested', 'approved'].includes(m.status)
  ).length

  let hostedApprovedMemberCount = 0
  const ownedIds = (ownedCampaigns || []).map(c => c.id)
  if (ownedIds.length) {
    const { count } = await sb
      .from('playlist_campaign_members')
      .select('id', { count: 'exact', head: true })
      .in('campaign_id', ownedIds)
      .eq('status', 'approved')
    hostedApprovedMemberCount = count || 0
  }

  return computePlaylistReputation({
    playlistCount: playlistCount || 0,
    ownedCampaignCount: ownedCampaignCount || 0,
    joinedCampaignCount,
    approvedMembershipCount,
    hostedApprovedMemberCount,
    approvedActivityCount: approvedActivityCount || 0,
    participationSubmitCount: participationSubmitCount || 0,
  })
}
