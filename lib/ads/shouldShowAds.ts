import { isAdsGloballyEnabled } from './config'
import { isPathAdsAllowed } from './pathPolicy'

/** Pro, Growth, Studio, and any future paid tier — no ads. */
export function isPaidPlan(planId?: string | null): boolean {
  if (!planId) return false
  return planId !== 'free'
}

export function resolveAdsVisibility(opts: {
  planId?: string | null
  pathname?: string | null
}): { show: boolean; reason?: string } {
  if (!isAdsGloballyEnabled()) return { show: false, reason: 'disabled' }
  if (isPaidPlan(opts.planId)) return { show: false, reason: 'paid_plan' }
  if (opts.pathname && !isPathAdsAllowed(opts.pathname)) return { show: false, reason: 'path_excluded' }
  return { show: true }
}
