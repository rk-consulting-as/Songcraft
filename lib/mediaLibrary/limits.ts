import type { PlanId } from '@/lib/subscription'
import type { MediaLibraryLimits } from './types'

const LIMITS: Record<PlanId, MediaLibraryLimits> = {
  free: {
    maxAssets: 25,
    maxFileBytes: 5 * 1024 * 1024,
    brandKitEnabled: false,
    campaignPacksEnabled: false,
  },
  pro: {
    maxAssets: 500,
    maxFileBytes: 20 * 1024 * 1024,
    brandKitEnabled: true,
    campaignPacksEnabled: true,
  },
}

/** Growth / Studio tiers map to pro limits until dedicated plans exist. */
export function getMediaLibraryLimits(planId: PlanId): MediaLibraryLimits {
  return LIMITS[planId] || LIMITS.free
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
