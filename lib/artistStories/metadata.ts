import { absoluteAppUrl } from '@/lib/appUrl'
import type { ArtistStory } from './types'

type ArtistMeta = { name: string; page_slug?: string | null }

export function buildStoryPageTitle(story: Pick<ArtistStory, 'seo_title' | 'title'>, artistName: string): string {
  const title = story.seo_title?.trim() || story.title
  return `${title} — ${artistName}`
}

export function buildStoryPageDescription(story: Pick<ArtistStory, 'seo_description' | 'excerpt' | 'body' | 'title'>): string {
  if (story.seo_description?.trim()) return story.seo_description.trim().slice(0, 160)
  if (story.excerpt?.trim()) return story.excerpt.trim().slice(0, 160)
  if (story.body?.trim()) return story.body.trim().replace(/\s+/g, ' ').slice(0, 160)
  return story.title
}

export function buildStoryCanonicalUrl(slug: string, storySlug: string): string {
  return absoluteAppUrl(`/p/${slug}/stories/${storySlug}`)
}

export function buildStoryListUrl(slug: string): string {
  return absoluteAppUrl(`/p/${slug}/stories`)
}

export function resolveStoryOgImage(story: Pick<ArtistStory, 'og_image_url' | 'cover_image_url'>, artistAvatar?: string | null): string | undefined {
  const raw = story.og_image_url || story.cover_image_url || artistAvatar
  if (!raw) return undefined
  return raw.startsWith('http') ? raw : absoluteAppUrl(raw)
}

export function buildStoryJsonLd(story: ArtistStory, artist: ArtistMeta) {
  const url = artist.page_slug ? buildStoryCanonicalUrl(artist.page_slug, story.slug) : undefined
  const image = resolveStoryOgImage(story)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: story.title,
    description: buildStoryPageDescription(story),
    ...(url ? { url, mainEntityOfPage: url } : {}),
    ...(image ? { image } : {}),
    datePublished: story.published_at || story.created_at,
    dateModified: story.updated_at,
    author: {
      '@type': 'MusicGroup',
      name: artist.name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ViaTone',
    },
  }
}
