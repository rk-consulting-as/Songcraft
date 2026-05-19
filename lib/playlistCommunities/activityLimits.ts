import type { PlanId } from '@/lib/subscription'

export type ActivityProofLimits = {
  canUploadImage: boolean
  canUploadCsv: boolean
  canUseAiReview: boolean
  canUseOwnerBoard: boolean
}

const LIMITS: Record<PlanId, ActivityProofLimits> = {
  free: {
    canUploadImage: false,
    canUploadCsv: false,
    canUseAiReview: false,
    canUseOwnerBoard: true,
  },
  pro: {
    canUploadImage: true,
    canUploadCsv: true,
    canUseAiReview: false,
    canUseOwnerBoard: true,
  },
}

export function getActivityProofLimits(planId: PlanId): ActivityProofLimits {
  return LIMITS[planId] || LIMITS.free
}

/** Growth / AI: treat pro+ with env key as growth for AI */
export function canUseAiReview(planId: PlanId): boolean {
  return planId === 'pro'
}
