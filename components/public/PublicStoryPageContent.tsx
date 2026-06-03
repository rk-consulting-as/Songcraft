'use client'

import Link from 'next/link'
import NewsletterSignup from '@/components/NewsletterSignup'
import ViaToneBranding from '@/components/platform/ViaToneBranding'
import PublicStoryJsonLd from '@/components/public/PublicStoryJsonLd'
import PublicAnalyticsTracker from '@/components/PublicAnalyticsTracker'
import { estimateReadTimeMinutes, formatReadTimeLabel } from '@/lib/artistStories/readTime'
import { trackPublicEvent } from '@/lib/publicAnalytics'
import type { ArtistStory } from '@/lib/artistStories/types'

type LinkedSong = {
  id: string
  title: string
  spotify_url?: string | null
  suno_url?: string | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
}

type Props = {
  story: ArtistStory
  artist: { id: string; name: string; page_slug: string; page_settings?: Record<string, unknown> | null }
  linkedSong?: LinkedSong | null
  relatedStories: Pick<ArtistStory, 'title' | 'slug' | 'excerpt' | 'cover_image_url'>[]
  accent?: string
  labels: {
    backToArtist: string
    relatedStories: string
    listenOnSpotify: string
    openSongPage: string
    listenToSong: string
    minRead: string
  }
}

export default function PublicStoryPageContent({ story, artist, linkedSong, relatedStories, accent = '#d4a843', labels }: Props) {
  const paragraphs = (story.body || '').split(/\n\n+/).filter(Boolean)
  const readMins = estimateReadTimeMinutes(story.body, story.excerpt)
  const readLabel = formatReadTimeLabel(readMins, { minRead: labels.minRead })

  const trackSongClick = () => {
    if (!linkedSong) return
    trackPublicEvent({
      artist_id: artist.id,
      song_id: linkedSong.id,
      story_id: story.id,
      event_type: 'story_song_click',
      source: 'story',
    })
  }

  return (
    <div className="public-surface public-story-page" style={{ ['--pub-accent' as string]: accent }}>
      <PublicAnalyticsTracker artistId={artist.id} storyId={story.id} eventType="story_view" />
      <PublicStoryJsonLd story={story} artist={artist} />
      <article className="public-story-page__article">
        <header className="public-story-page__header">
          <Link href={`/p/${artist.page_slug}`} className="public-story-page__back">{labels.backToArtist}</Link>
          {story.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.cover_image_url} alt="" className="public-story-page__cover" />
          )}
          <h1 className="public-story-page__title">{story.title}</h1>
          <p className="public-story-page__meta">{readLabel}</p>
          {story.excerpt && <p className="public-story-page__excerpt">{story.excerpt}</p>}
        </header>

        <div className="public-story-page__body">
          {paragraphs.length > 0 ? paragraphs.map(p => (
            <p key={p.slice(0, 24)}>{p}</p>
          )) : (
            <p style={{ color: '#8a7a60' }}>{story.excerpt || ''}</p>
          )}
        </div>

        {linkedSong && (
          <section className="public-story-page__song">
            <h2 className="public-section__title">{labels.listenToSong}</h2>
            <p className="public-story-page__song-title">{linkedSong.title}</p>
            <div className="public-story-page__listen">
              <Link
                href={`/s/${linkedSong.id}`}
                className="btn-gold"
                style={{ textDecoration: 'none' }}
                onClick={trackSongClick}
              >
                {labels.openSongPage}
              </Link>
              {linkedSong.spotify_url && (
                <a
                  href={linkedSong.spotify_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                  style={{ textDecoration: 'none' }}
                  onClick={trackSongClick}
                >
                  {labels.listenOnSpotify}
                </a>
              )}
            </div>
            {(linkedSong.cover_image_url || linkedSong.spotify_cover_url) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={linkedSong.cover_image_url || linkedSong.spotify_cover_url || ''}
                alt={linkedSong.title}
                className="public-story-page__song-cover"
              />
            )}
          </section>
        )}

        <section className="public-story-page__newsletter">
          <NewsletterSignup artistId={artist.id} sourcePage={`/p/${artist.page_slug}/stories/${story.slug}`} accent={accent} />
        </section>

        {relatedStories.length > 0 && (
          <section className="public-story-page__related">
            <h2 className="public-section__title">{labels.relatedStories}</h2>
            <ul className="public-stories-grid public-story-page__related-grid">
              {relatedStories.map(s => (
                <li key={s.slug}>
                  <Link href={`/p/${artist.page_slug}/stories/${s.slug}`} className="public-story-card">
                    {s.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.cover_image_url} alt="" className="public-story-card__cover" />
                    ) : (
                      <div className="public-story-card__cover public-story-card__cover--empty" aria-hidden="true">📖</div>
                    )}
                    <div className="public-story-card__body">
                      <h3 className="public-story-card__title">{s.title}</h3>
                      {s.excerpt && <p className="public-story-card__excerpt">{s.excerpt}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <ViaToneBranding />
    </div>
  )
}
