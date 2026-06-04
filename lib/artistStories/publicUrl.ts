import { clientPublicUrl } from '@/lib/appUrl'
import { isStoryPubliclyLive } from './visibility'
import { normalizeStorySlug, storySlugLookupVariants } from './slug'
import type { ArtistStory, StoryStatus } from './types'

export type StoryShareState =
  | 'live'
  | 'draft'
  | 'scheduled'
  | 'hidden'
  | 'artist_not_public'
  | 'missing_slug'

export type StoryShareArtist = {
  page_slug?: string | null
  page_enabled?: boolean
  admin_hidden?: boolean
}

export type StoryShareFields = {
  slug?: string | null
  status?: StoryStatus | string
  published_at?: string | null
  public_hidden?: boolean
  admin_hidden?: boolean
}

export function getStoryShareState(
  story: StoryShareFields,
  artist: StoryShareArtist,
  now: Date = new Date(),
): StoryShareState {
  if (!story.slug?.trim()) return 'missing_slug'
  if (!artist.page_enabled || !artist.page_slug?.trim() || artist.admin_hidden) return 'artist_not_public'
  if (story.public_hidden || story.admin_hidden) return 'hidden'
  if (story.status === 'draft' || story.status === 'archived') return 'draft'
  if (!story.published_at) return 'draft'
  if (story.status === 'scheduled') return 'scheduled'
  const publishAt = new Date(story.published_at)
  if (Number.isNaN(publishAt.getTime())) return 'draft'
  if (publishAt.getTime() > now.getTime()) return 'scheduled'
  if (isStoryPubliclyLive({ ...story, status: story.status || 'draft' }, now)) return 'live'
  return 'draft'
}

export function isStoryLive(
  story: StoryShareFields,
  artist: StoryShareArtist,
  now: Date = new Date(),
): boolean {
  return getStoryShareState(story, artist, now) === 'live'
}

export function getStoryPublicUrl(
  story: Pick<StoryShareFields, 'slug'>,
  artist: StoryShareArtist,
): string {
  if (!artist.page_slug?.trim() || !story.slug?.trim()) return ''
  const slug = normalizeStorySlug(story.slug)
  return clientPublicUrl(`/p/${artist.page_slug}/stories/${slug}`)
}

/** Owner workspace link (private) — safe to copy when story is not public yet. */
export function getStoryWorkspaceUrl(artistId: string): string {
  return clientPublicUrl(`/artist/${artistId}#brand-stories`)
}

export function getStoryShareCopyUrl(
  story: StoryShareFields,
  artist: StoryShareArtist & { id?: string },
  now: Date = new Date(),
): { url: string; state: StoryShareState } {
  const state = getStoryShareState(story, artist, now)
  if (state === 'live') {
    return { url: getStoryPublicUrl(story, artist), state }
  }
  if (artist.id) {
    return { url: getStoryWorkspaceUrl(artist.id), state }
  }
  return { url: '', state }
}

/** Slugs to try when resolving a public story route (legacy underscores). */
export function storySlugRouteParam(param: string): string[] {
  return storySlugLookupVariants(param)
}
