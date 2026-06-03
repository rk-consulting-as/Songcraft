import Link from 'next/link'
import NewsletterSignup from '@/components/NewsletterSignup'
import ViaToneBranding from '@/components/platform/ViaToneBranding'
import PublicStoryJsonLd from '@/components/public/PublicStoryJsonLd'
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
  }
}

export default function PublicStoryPageContent({ story, artist, linkedSong, relatedStories, accent = '#d4a843', labels }: Props) {
  const paragraphs = (story.body || '').split(/\n\n+/).filter(Boolean)

  return (
    <div className="public-surface public-story-page" style={{ ['--pub-accent' as string]: accent }}>
      <PublicStoryJsonLd story={story} artist={artist} />
      <article className="public-story-page__article">
        <header className="public-story-page__header">
          <Link href={`/p/${artist.page_slug}`} className="public-story-page__back">{labels.backToArtist}</Link>
          {story.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.cover_image_url} alt="" className="public-story-page__cover" />
          )}
          <h1 className="public-story-page__title">{story.title}</h1>
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
            <h2 className="public-section__title">{linkedSong.title}</h2>
            <div className="public-story-page__listen">
              <Link href={`/s/${linkedSong.id}`} className="btn-gold" style={{ textDecoration: 'none' }}>
                {labels.openSongPage}
              </Link>
              {linkedSong.spotify_url && (
                <a href={linkedSong.spotify_url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ textDecoration: 'none' }}>
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
            <ul className="public-story-page__related-list">
              {relatedStories.map(s => (
                <li key={s.slug}>
                  <Link href={`/p/${artist.page_slug}/stories/${s.slug}`}>{s.title}</Link>
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
