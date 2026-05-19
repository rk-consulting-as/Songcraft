import type { PlanId } from '@/lib/subscription'
import type { PlaybookArtist, PlaybookContext } from './types'
import type { GrowthMissionCategory, GrowthMissionDef, GrowthMissionDifficulty } from './growthMissions'

export type GrowthTier = 'beginner' | 'intermediate' | 'advanced'

export type GrowthMilestoneDef = {
  id: string
  checkId: string
  labelKey: string
  icon: string
  badgeKey?: string
}

export type GrowthMissionResult = Omit<GrowthMissionDef, 'href'> & {
  done: boolean
  href: string | null
  label: string
  description?: string
  locked?: boolean
}

export type GrowthMissionCategoryResult = {
  id: GrowthMissionCategory
  label: string
  percent: number
  doneCount: number
  totalCount: number
  missions: GrowthMissionResult[]
}

export type GrowthMilestoneResult = GrowthMilestoneDef & {
  done: boolean
  label: string
  badge?: string
}

export type GrowthRecommendation = {
  title: string
  description: string
  href: string | null
  missionId?: string
}

export type GrowthEmptyState = {
  id: string
  message: string
  href: string | null
}

export type GrowthUpgradePrompt = {
  title: string
  description: string
  href: string
  ctaKey: string
}

export type GrowthEngineSnapshot = {
  growthScorePercent: number
  growthTier: GrowthTier
  tierLabel: string
  creatorLevel: string
  missions: GrowthMissionResult[]
  categories: GrowthMissionCategoryResult[]
  milestones: GrowthMilestoneResult[]
  nextRecommendation: GrowthRecommendation | null
  releaseRecommendation: GrowthRecommendation | null
  growthRecommendation: GrowthRecommendation | null
  emptyStates: GrowthEmptyState[]
  upgradePrompt: GrowthUpgradePrompt | null
  completedMissionCount: number
  totalMissionCount: number
}

export type PlaybookEngineSnapshot = {
  planId: PlanId
  primaryArtist: PlaybookArtist | null
  growth: GrowthEngineSnapshot
}

export type { GrowthMissionCategory, GrowthMissionDifficulty, GrowthMissionDef }
