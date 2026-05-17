export type PlanId = 'free' | 'pro'

export type UserPlan = {
  id: PlanId
  name: string
  status: string
  current_period_end?: string | null
}

export type FeatureKey =
  | 'artists'
  | 'songs'
  | 'public_pages'
  | 'ai_generations_monthly'
  | 'advanced_analytics'
  | 'newsletter_analytics'
  | 'qr_analytics'
  | 'advanced_templates'
  | 'embed_widget'
  | 'custom_branding'
  | 'remove_songcraft_branding'

export const FREE_LIMITS: Record<string, { limit: number | null; enabled: boolean }> = {
  artists: { limit: 1, enabled: true },
  songs: { limit: 10, enabled: true },
  public_pages: { limit: 1, enabled: true },
  ai_generations_monthly: { limit: 25, enabled: true },
  advanced_analytics: { limit: null, enabled: false },
  newsletter_analytics: { limit: null, enabled: false },
  qr_analytics: { limit: null, enabled: false },
  advanced_templates: { limit: null, enabled: false },
  embed_widget: { limit: null, enabled: false },
  custom_branding: { limit: null, enabled: false },
  remove_songcraft_branding: { limit: null, enabled: false },
}

export const PRO_LIMITS: Record<string, { limit: number | null; enabled: boolean }> = {
  artists: { limit: null, enabled: true },
  songs: { limit: null, enabled: true },
  public_pages: { limit: null, enabled: true },
  ai_generations_monthly: { limit: 1000, enabled: true },
  advanced_analytics: { limit: null, enabled: true },
  newsletter_analytics: { limit: null, enabled: true },
  qr_analytics: { limit: null, enabled: true },
  advanced_templates: { limit: null, enabled: true },
  embed_widget: { limit: null, enabled: true },
  custom_branding: { limit: null, enabled: true },
  remove_songcraft_branding: { limit: null, enabled: true },
}

export function isProStatus(status?: string | null) {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

export async function getUserPlan(supabase: any, userId: string): Promise<UserPlan> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_id, status, current_period_end, plans(name)')
    .eq('user_id', userId)
    .maybeSingle()

  if (data && data.plan_id === 'pro' && isProStatus(data.status)) {
    return {
      id: 'pro',
      name: (data.plans as any)?.name || 'Pro',
      status: data.status,
      current_period_end: data.current_period_end,
    }
  }

  return { id: 'free', name: 'Free', status: data?.status || 'free', current_period_end: data?.current_period_end || null }
}

export async function canUseFeature(
  supabase: any,
  userId: string,
  featureKey: FeatureKey,
  currentUsage = 0
): Promise<{ allowed: boolean; plan: UserPlan; limit: number | null; enabled: boolean; reason?: 'disabled' | 'limit' }> {
  const plan = await getUserPlan(supabase, userId)
  const fallback = plan.id === 'pro' ? PRO_LIMITS[featureKey] : FREE_LIMITS[featureKey]
  const { data } = await supabase
    .from('feature_limits')
    .select('limit_value, enabled')
    .eq('plan_id', plan.id)
    .eq('feature_key', featureKey)
    .maybeSingle()

  const enabled = data?.enabled ?? fallback?.enabled ?? true
  const limit = typeof data?.limit_value === 'number' ? data.limit_value : fallback?.limit ?? null

  if (!enabled) return { allowed: false, plan, limit, enabled, reason: 'disabled' }
  if (limit !== null && currentUsage >= limit) return { allowed: false, plan, limit, enabled, reason: 'limit' }
  return { allowed: true, plan, limit, enabled }
}

export async function getMonthlyAiUsage(supabase: any, userId: string): Promise<number> {
  const start = new Date()
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'success')
    .gte('created_at', start.toISOString())
  return count || 0
}

export async function trackAiUsage(
  supabase: any,
  args: { userId: string; provider?: string; model?: string; status?: 'success' | 'error'; featureKey?: string; metadata?: Record<string, any> }
) {
  await supabase.from('ai_usage_events').insert({
    user_id: args.userId,
    feature_key: args.featureKey || 'ai_generation',
    provider: args.provider || null,
    model: args.model || null,
    status: args.status || 'success',
    metadata: args.metadata || {},
  })
}
