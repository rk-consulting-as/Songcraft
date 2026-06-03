import Link from 'next/link'
import { estimateReadTimeMinutes, formatReadTimeLabel } from '@/lib/artistStories/readTime'
import type { ArtistStory } from '@/lib/artistStories/types'

type Props = {
  stories: (Pick<ArtistStory, 'title' | 'slug' | 'excerpt' | 'cover_image_url' | 'published_at' | 'story_type'> & { body?: string | null })[]
  pageSlug: string
  accent?: string
  title: string
  viewAllLabel: string
  minReadLabel: string
}

export default function PublicStoriesSection({ stories, pageSlug, accent = '#d4a843', title, viewAllLabel, minReadLabel }: Props) {
  if (stories.length === 0) return null

  return (
    <section className="public-section public-stories-section">
      <div className="public-stories-section__head">
        <h2 className="public-section__title">{title}</h2>
        <Link href={`/p/${pageSlug}/stories`} className="public-stories-section__all" style={{ color: accent }}>
          {viewAllLabel} →
        </Link>
      </div>
      <div className="public-stories-grid">
        {stories.slice(0, 3).map(story => {
          const readLabel = formatReadTimeLabel(
            estimateReadTimeMinutes(story.body, story.excerpt),
            { minRead: minReadLabel },
          )
          return (
          <Link key={story.slug} href={`/p/${pageSlug}/stories/${story.slug}`} className="public-story-card">
            {story.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={story.cover_image_url} alt="" className="public-story-card__cover" />
            ) : (
              <div className="public-story-card__cover public-story-card__cover--empty" aria-hidden="true">📖</div>
            )}
            <div className="public-story-card__body">
              <h3 className="public-story-card__title">{story.title}</h3>
              <p className="public-story-card__read-time">{readLabel}</p>
              {story.excerpt && <p className="public-story-card__excerpt">{story.excerpt}</p>}
            </div>
          </Link>
          )
        })}
      </div>
    </section>
  )
}
