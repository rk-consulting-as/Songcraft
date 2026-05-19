import type { PlanId } from '@/lib/subscription'
import { type Lang } from '@/lib/i18n'
import { computePlaybookProgress } from './compute'
import { computeGrowthEngine } from './computeGrowth'
import type { GrowthEngineSnapshot } from './growthTypes'
import type { PlaybookContext, PlaybookProgress } from './types'

export type PlaybookEngineResult = {
  progress: PlaybookProgress
  growth: GrowthEngineSnapshot
  planId: PlanId
}

export function computePlaybookEngine(
  ctx: PlaybookContext,
  lang: Lang,
  planId: PlanId = 'free'
): PlaybookEngineResult {
  return {
    progress: computePlaybookProgress(ctx, lang),
    growth: computeGrowthEngine(ctx, lang, planId),
    planId,
  }
}
