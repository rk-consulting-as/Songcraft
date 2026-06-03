import type { StoryStatus } from './types'

/** Story is visible on public routes (no cron — time-gated at read). */
export function isStoryPubliclyLive(
  story: { status: StoryStatus | string; published_at?: string | null; public_hidden?: boolean; admin_hidden?: boolean },
  now: Date = new Date(),
): boolean {
  if (story.public_hidden || story.admin_hidden) return false
  if (story.status !== 'published' && story.status !== 'scheduled') return false
  if (!story.published_at) return false
  return new Date(story.published_at).getTime() <= now.getTime()
}

/** Counts toward published-story plan limits (live or scheduled for future). */
export function countsTowardPublishLimit(story: { status: string; published_at?: string | null }): boolean {
  if (story.status === 'published') return true
  if (story.status === 'scheduled' && story.published_at) return true
  return false
}

export function publicStoriesNowIso(now: Date = new Date()): string {
  return now.toISOString()
}
