import Link from 'next/link'
import type { V2Artist } from '@/lib/v2/types'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = {
  artist: V2Artist
}

export default function V2ArtistCard({ artist }: Props) {
  return (
    <article className="v2-card v2-artist-card">
      <div className="v2-artist-hero" style={{ ['--v2-cover-img' as string]: `url('${artist.coverImageUrl}')` }} />
      <div className="v2-artist-info">
        <div className="v2-artist-logo">{artist.avatarInitial}</div>
        <h3 style={{ margin: '10px 0 4px' }}>
          <Link href={V2_ROUTES.artist(artist.slug)} style={{ color: 'inherit', textDecoration: 'none' }}>
            {artist.name}
          </Link>
        </h3>
        <p className="v2-meta">{artist.genre} · {artist.songCount} songs · {artist.circleCount} active circles</p>
        <div className="v2-tagrow">
          {artist.platforms.map(p => <span key={p} className="v2-tag">{p}</span>)}
        </div>
        <Link href={V2_ROUTES.artist(artist.slug)} className="v2-btn sm" style={{ marginTop: 12 }}>
          View profile
        </Link>
      </div>
    </article>
  )
}
