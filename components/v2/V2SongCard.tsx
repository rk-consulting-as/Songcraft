import Link from 'next/link'
import type { V2Song } from '@/lib/v2/types'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = {
  song: V2Song
}

export default function V2SongCard({ song }: Props) {
  return (
    <article className="v2-card">
      <div className="v2-cover" style={{ ['--v2-cover-img' as string]: `url('${song.coverImageUrl}')` }} />
      <h4>
        <Link href={V2_ROUTES.song(song.id)} style={{ color: 'inherit', textDecoration: 'none' }}>
          {song.title}
        </Link>
      </h4>
      <p className="v2-meta">{song.artistName}</p>
      <div className="v2-tagrow">
        <span className={`v2-tag${song.creationType.includes('ai') ? ' ai' : ' human'}`}>
          {song.creationType.replace('_', ' ')}
        </span>
        {song.needsFeedback && <span className="v2-tag">Needs feedback</span>}
        <span className="v2-tag">{song.releaseStatus.replace('_', ' ')}</span>
      </div>
      <div className="v2-minirow">
        <span className="v2-meta">{Object.keys(song.platforms).join(' · ') || 'No links yet'}</span>
        <Link href={V2_ROUTES.song(song.id)} className="v2-btn secondary sm">Open</Link>
      </div>
    </article>
  )
}
