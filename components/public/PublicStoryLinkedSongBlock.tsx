'use client'

import Link from 'next/link'
import MediaLinksGrid from '@/components/MediaLinksGrid'
import { buildSongListenLinks } from '@/lib/songs/publicListenLinks'
import { trackPublicEvent } from '@/lib/publicAnalytics'

export type StoryLinkedSong = {
  id: string
  title: string
  spotify_url?: string | null
  suno_url?: string | null
  media_links?: { platform: string; url: string; label?: string }[] | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
}

type Props = {
  song: StoryLinkedSong
  artistId: string
  artistName: string
  storyId: string
  pageSlug: string
  accent?: string
  labels: {
    sectionTitle: string
    openSongPage: string
  }
  placement?: 'top' | 'bottom'
}

export default function PublicStoryLinkedSongBlock({
  song,
  artistId,
  artistName,
  storyId,
  pageSlug,
  accent = '#d4a843',
  labels,
  placement = 'top',
}: Props) {
  const mediaLinks = buildSongListenLinks(song)
  const cover = song.cover_image_url || song.spotify_cover_url
  const sourcePage = `/p/${pageSlug}/stories`

  const trackClick = (platform: string) => {
    trackPublicEvent({
      artist_id: artistId,
      song_id: song.id,
      story_id: storyId,
      event_type: 'story_song_click',
      source: 'story',
      metadata: { platform, placement },
    })
  }

  return (
    <section
      className={`public-story-page__song public-story-page__song--${placement}`}
      aria-labelledby={`story-song-${placement}`}
    >
      <h2 id={`story-song-${placement}`} className="public-section__title">{labels.sectionTitle}</h2>
      <div className="public-story-page__song-card">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="public-story-page__song-cover" />
        )}
        <div className="public-story-page__song-meta">
          <p className="public-story-page__song-title">{song.title}</p>
          <p className="public-story-page__song-artist">{artistName}</p>
          <div className="public-story-page__listen">
            <Link
              href={`/s/${song.id}`}
              className="btn-gold"
              style={{ textDecoration: 'none' }}
              onClick={() => trackClick('song_page')}
            >
              {labels.openSongPage}
            </Link>
          </div>
          {mediaLinks.length > 0 && (
            <div className="public-story-page__song-links">
              <MediaLinksGrid
                links={mediaLinks}
                songId={song.id}
                artistId={artistId}
                sourcePage={sourcePage}
                accent={accent}
                onLinkClick={targetType => trackClick(targetType)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
