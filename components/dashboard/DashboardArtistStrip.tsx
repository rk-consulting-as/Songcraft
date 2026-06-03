'use client'

import Link from 'next/link'
import type { ArtistStripItem } from '@/lib/dashboard/types'

type Props = {
  artists: ArtistStripItem[]
  tx: Record<string, string>
  onCreateArtist: () => void
}

export default function DashboardArtistStrip({ artists, tx, onCreateArtist }: Props) {
  return (
    <section id="artists" className="dashboard-section dashboard-artist-strip">
      <div className="dashboard-section__head">
        <h2 className="dashboard-section__title">{tx.cmdMyArtists}</h2>
        <button type="button" className="btn-gold quick-action-btn" onClick={onCreateArtist}>{tx.newArtist}</button>
      </div>

      {artists.length === 0 ? (
        <div className="card workspace-card workspace-glass dashboard-artist-strip__empty">
          <p className="workspace-section-desc">{tx.noArtists}</p>
          <button type="button" className="btn-gold quick-action-btn" onClick={onCreateArtist}>{tx.newArtist}</button>
        </div>
      ) : (
        <div className="dashboard-artist-strip__scroll">
          {artists.map(artist => {
            const img = artist.avatar_url || artist.spotify_image_url
            return (
              <article key={artist.id} className="dashboard-artist-card card workspace-card">
                <Link href={`/artist/${artist.id}`} className="dashboard-artist-card__main">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="dashboard-artist-card__avatar" />
                  ) : (
                    <div className="dashboard-artist-card__avatar dashboard-artist-card__avatar--empty" aria-hidden="true">🎤</div>
                  )}
                  <div className="dashboard-artist-card__body">
                    <h3 className="dashboard-artist-card__name">{artist.name}</h3>
                    {artist.genre && <p className="dashboard-artist-card__genre">{artist.genre}</p>}
                    <div className="dashboard-artist-card__meta">
                      <span className="dashboard-artist-card__score">{artist.growthScore}%</span>
                      <span className={`dashboard-artist-card__badge dashboard-artist-card__badge--${artist.statusKey}`}>
                        {artist.statusLabel}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="dashboard-artist-card__actions">
                  <Link href={`/artist/${artist.id}`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', fontSize: 11 }}>
                    {tx.openArtist}
                  </Link>
                  <Link href={`/artist/${artist.id}#songs`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', fontSize: 11 }}>
                    {tx.cmdCreateSong}
                  </Link>
                  <Link href={`/growth?artist=${artist.id}`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', fontSize: 11 }}>
                    {tx.cmdGrowthHub}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
