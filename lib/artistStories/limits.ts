import type { PlanId } from '@/lib/subscription'

export const FREE_PUBLISHED_STORIES_LIMIT = 3
export const PRO_PUBLISHED_STORIES_LIMIT = 100

import { countsTowardPublishLimit } from './visibility'

export function getPublishedStoriesLimit(planId: PlanId): number | null {
  return planId === 'pro' ? PRO_PUBLISHED_STORIES_LIMIT : FREE_PUBLISHED_STORIES_LIMIT
}

export function countStoriesTowardLimit(stories: { status: string; published_at?: string | null }[]): number {
  return stories.filter(countsTowardPublishLimit).length
}

export function canPublishMoreStories(planId: PlanId, stories: { status: string; published_at?: string | null }[]): boolean {
  const limit = getPublishedStoriesLimit(planId)
  if (limit === null) return true
  return countStoriesTowardLimit(stories) < limit
}

export function canUseStorySeoControls(planId: PlanId): boolean {
  return planId === 'pro'
}

export function canGenerateStoryWithAi(planId: PlanId): boolean {
  return planId === 'pro'
}
