import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserPlan, isProStatus } from '@/lib/subscription'
import type { V2HostCapabilities, V2PlanTier } from '@/lib/v2/types'

/** When false (default), creation APIs stay open for beta; UI still shows upgrade prompts. */
export function isHostProStrictMode(): boolean {
  return process.env.V2_HOST_PRO_STRICT === 'true'
}

export function isHostProStripeConfigured(): boolean {
  return !!(process.env.STRIPE_HOST_PRO_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_HOST_PRO_PRICE_ID)
}

async function hasManualPlanOverride(sb: SupabaseClient, userId: string, planKey: string): Promise<boolean> {
  const { data: overrides } = await sb
    .from('manual_plan_overrides')
    .select('expires_at, revoked_at')
    .eq('user_id', userId)
    .eq('plan_key', planKey)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  const now = Date.now()
  return (overrides || []).some(row => {
    if (row.revoked_at) return false
    if (!row.expires_at) return true
    return new Date(row.expires_at).getTime() > now
  })
}

async function hasStripeHostPro(sb: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await sb
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return false
  const planId = String(data.plan_id || '')
  return (planId === 'host_pro' || planId === 'host') && isProStatus(data.status)
}

export async function fetchIsV2Admin(sb: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle()
  const role = data?.role
  return role === 'admin' || role === 'super_admin'
}

export async function fetchIsExistingHost(sb: SupabaseClient, userId: string): Promise<boolean> {
  const [circles, sessions, rooms] = await Promise.all([
    sb.from('v2_circles').select('id', { count: 'exact', head: true }).eq('owner_user_id', userId),
    sb.from('v2_sessions').select('id', { count: 'exact', head: true }).eq('host_user_id', userId),
    sb.from('v2_playlist_rooms').select('id', { count: 'exact', head: true }).eq('owner_user_id', userId),
  ])
  return (circles.count || 0) + (sessions.count || 0) + (rooms.count || 0) > 0
}

export async function resolveV2HostCapabilities(
  sb: SupabaseClient,
  userId: string,
): Promise<V2HostCapabilities> {
  const [isAdmin, artistPlan, hostProManual, hostProStripe, isExistingHost] = await Promise.all([
    fetchIsV2Admin(sb, userId),
    getUserPlan(sb, userId),
    hasManualPlanOverride(sb, userId, 'host_pro'),
    hasStripeHostPro(sb, userId),
    fetchIsExistingHost(sb, userId),
  ])

  const softGating = !isHostProStrictMode() || !isHostProStripeConfigured()
  const hostProActive = isAdmin || hostProManual || hostProStripe
  const canCreate = hostProActive || softGating

  let tier: V2PlanTier = 'free'
  if (hostProActive) tier = 'host_pro'
  else if (artistPlan.id === 'pro' && isProStatus(artistPlan.status)) tier = 'pro_artist'

  return {
    tier,
    isAdmin,
    hostProActive,
    softGating,
    isExistingHost,
    canCreateCircle: canCreate,
    canCreateSession: canCreate,
    canCreatePlaylistRoom: canCreate,
    canViewRecaps: hostProActive || isExistingHost || isAdmin || softGating,
    canViewSupporterReports: hostProActive || isAdmin || softGating,
    showUpgradePrompt: !hostProActive && !isAdmin,
  }
}

export async function canManageSessionHost(
  sb: SupabaseClient,
  userId: string,
  hostUserId: string,
): Promise<boolean> {
  if (hostUserId === userId) return true
  return fetchIsV2Admin(sb, userId)
}

export async function canManagePlaylistRoomHost(
  sb: SupabaseClient,
  userId: string,
  ownerUserId: string,
): Promise<boolean> {
  if (ownerUserId === userId) return true
  return fetchIsV2Admin(sb, userId)
}
