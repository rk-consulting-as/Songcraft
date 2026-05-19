import { getUserPlan, type PlanId, type UserPlan } from '@/lib/subscription'

const FALLBACK_FREE: UserPlan = {
  id: 'free',
  name: 'Free',
  status: 'free',
  source: 'free',
}

/**
 * Never throws — returns Free plan if subscriptions table or overrides are unavailable.
 */
export async function safeGetUserPlan(supabase: unknown, userId: string): Promise<UserPlan> {
  if (!userId) return FALLBACK_FREE
  try {
    return await getUserPlan(supabase, userId)
  } catch {
    return FALLBACK_FREE
  }
}

export function isProPlan(plan: UserPlan | PlanId | null | undefined): boolean {
  const id = typeof plan === 'string' ? plan : plan?.id
  return id === 'pro'
}
