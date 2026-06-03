import Link from 'next/link'
import ShareButtons from '@/components/ShareButtons'
import ClientEmbedPlayer from '@/components/ClientEmbedPlayer'

type Song = {
  id: string
  title: string
  backstory?: string | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  spotify_url?: string | null
  suno_url?: string | null
  suno_audio_url?: string | null
  media_links?: { platform: string; url: string }[] | null
}

type Featured = {
  type: 'song' | 'album'
  id: string
  title: string
  coverUrl: string | null
  href: string | null
  isFallback?: boolean
}

type Props = {
  featured: Featured
  song?: Song | null
  artistName: string
  pageSlug: string
  accent?: string
  labels: {
    sectionTitle: string
    fallbackLabel: string
    listen: string
    openSong: string
    share: string
  }
}

export default function PublicFeaturedReleaseBlock({
  featured,
  song,
  artistName,
  pageSlug,
  accent = '#d4a843',
  labels,
}: Props) {
  const excerpt = song?.backstory?.trim() || ''
  const displayExcerpt = excerpt.length > 220 ? `${excerpt.slice(0, 220)}…` : excerpt

  return (
    <section className="public-section public-featured-release">
      <p className="public-featured-release__eyebrow" style={{ color: accent }}>
        {featured.isFallback ? labels.fallbackLabel : labels.sectionTitle}
      </p>
      <div className="public-featured-release__card public-card public-card--glass">
        <div className="public-featured-release__main">
          {featured.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featured.coverUrl} alt="" className="public-featured-release__cover" />
          ) : (
            <div className="public-featured-release__cover public-featured-release__cover--empty">🎵</div>
          )}
          <div className="public-featured-release__copy">
            <h2 className="public-featured-release__title">{featured.title}</h2>
            {displayExcerpt && (
              <p className="public-featured-release__story">{displayExcerpt}</p>
            )}
            <div className="public-featured-release__actions">
              {featured.href && (
                <Link href={featured.href} className="public-btn public-btn--primary" style={{ background: accent, borderColor: accent }}>
                  {labels.openSong}
                </Link>
              )}
              {song && (
                <div className="public-featured-release__player">
                  <ClientEmbedPlayer
                    song={{
                      id: song.id,
                      title: song.title,
                      cover_image_url: song.cover_image_url,
                      spotify_cover_url: song.spotify_cover_url,
                      suno_audio_url: song.suno_audio_url,
                      spotify_url: song.spotify_url,
                      suno_url: song.suno_url,
                      media_links: song.media_links,
                      artist_name: artistName,
                    }}
                    showCounter={false}
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="public-featured-release__share">
          <span className="public-featured-release__share-label">{labels.share}</span>
          <ShareButtons
            url={featured.href || `/p/${pageSlug}`}
            title={`${featured.title} — ${artistName}`}
            text={`Listen to ${featured.title} by ${artistName}`}
            accent={accent}
          />
        </div>
      </div>
    </section>
  )
}
