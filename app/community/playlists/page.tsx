import Link from 'next/link'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { V2_PLAYLISTS } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'

export default function PlaylistsIndexPage() {
  return (
    <>
      <V2SectionHeader
        title="Playlist Rooms"
        lead="Persistent rooms around playlists — connected to the Stream Engine."
      />
      <div className="v2-grid cols-2" style={{ marginTop: 16 }}>
        {V2_PLAYLISTS.map(room => (
          <article key={room.id} className="v2-card">
            <div className="v2-cover" style={{ ['--v2-cover-img' as string]: `url('${room.coverImageUrl}')` }} />
            <h4>{room.name}</h4>
            <p className="v2-meta">{room.description}</p>
            <div className="v2-tagrow">
              <span className="v2-tag">{room.platform}</span>
              <span className="v2-tag">{room.trackCount} tracks</span>
            </div>
            {room.circleSlug && (
              <Link href={V2_ROUTES.circle(room.circleSlug)} className="v2-btn secondary sm" style={{ marginTop: 12 }}>
                View circle
              </Link>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
