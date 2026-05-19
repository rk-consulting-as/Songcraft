import type { PlanId } from '@/lib/subscription'

export type PlaylistCommunityLimits = {
  maxCampaigns: number
  canCreatePublicCampaigns: boolean
}

const LIMITS: Record<PlanId, PlaylistCommunityLimits> = {
  free: {
    maxCampaigns: 1,
    canCreatePublicCampaigns: true,
  },
  pro: {
    maxCampaigns: 20,
    canCreatePublicCampaigns: true,
  },
}

export function getPlaylistCommunityLimits(planId: PlanId): PlaylistCommunityLimits {
  return LIMITS[planId] || LIMITS.free
}
