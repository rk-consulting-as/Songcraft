import type { SupabaseClient } from '@supabase/supabase-js'

export async function getApprovedMembership(
  sb: SupabaseClient,
  campaignId: string,
  userId: string
) {
  const { data } = await sb
    .from('playlist_campaign_members')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle()
  return data
}

export async function isCampaignOwner(sb: SupabaseClient, campaignId: string, userId: string) {
  const { data } = await sb
    .from('playlist_campaigns')
    .select('user_id')
    .eq('id', campaignId)
    .maybeSingle()
  return data?.user_id === userId
}

export async function canAccessParticipation(sb: SupabaseClient, campaignId: string, userId: string) {
  if (await isCampaignOwner(sb, campaignId, userId)) return { ok: true as const, role: 'owner' as const }
  const member = await getApprovedMembership(sb, campaignId, userId)
  if (member) return { ok: true as const, role: 'member' as const, member }
  return { ok: false as const }
}
