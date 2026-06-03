import Link from 'next/link'

type Song = {
  id: string
  title: string
  spotify_cover_url?: string | null
  cover_image_url?: string | null
  spotify_album?: string | null
  spotify_release_date?: string | null
}

type Props = {
  songs: Song[]
  accent?: string
  title: string
  viewAllLabel?: string
  pageSlug?: string
}

export default function PublicLatestSongsGrid({ songs, accent = '#d4a843', title, viewAllLabel }: Props) {
  if (songs.length === 0) return null
  const items = songs.slice(0, 6)

  return (
    <section className="public-section">
      <h2 className="public-section__title">{title}</h2>
      <div className="public-songs-grid">
        {items.map((song, i) => {
          const thumb = song.spotify_cover_url || song.cover_image_url
          return (
            <Link key={song.id} href={`/s/${song.id}`} className="public-songs-grid__item">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="public-songs-grid__thumb" />
              ) : (
                <div className="public-songs-grid__thumb public-songs-grid__thumb--empty">#{i + 1}</div>
              )}
              <div className="public-songs-grid__meta">
                <span className="public-songs-grid__title">{song.title}</span>
                {(song.spotify_album || song.spotify_release_date) && (
                  <span className="public-songs-grid__sub">
                    {song.spotify_album}
                    {song.spotify_release_date ? ` · ${song.spotify_release_date.slice(0, 4)}` : ''}
                  </span>
                )}
              </div>
              <span className="public-songs-grid__cta" style={{ color: accent }}>→</span>
            </Link>
          )
        })}
      </div>
      {songs.length > 6 && viewAllLabel && (
        <p className="public-songs-grid__more" style={{ color: accent }}>{viewAllLabel}</p>
      )}
    </section>
  )
}
