import Link from 'next/link'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { fetchPlaylistRooms } from '@/lib/v2/data/community'
import { V2_ROUTES } from '@/lib/v2/routes'
import { CURATOR_LABELS } from '@/lib/v2/types'

export const dynamic = 'force-dynamic'

export default async function CuratorRoomsIndexPage() {
  const { rooms, fromMock } = await fetchPlaylistRooms()

  return (
    <>
      <V2SectionHeader
        title={CURATOR_LABELS.rooms}
        lead="Communities built around playlists, song submissions, listening sessions, feedback, and curator decisions."
      />
      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          Demo Curator Rooms — apply migrations and seed for live curator workflow.
        </p>
      )}
      <div className="v2-grid cols-2" style={{ marginTop: 16 }}>
        {rooms.map(room => (
          <article key={room.id} className="v2-card">
            <div className="v2-cover" style={{ ['--v2-cover-img' as string]: `url('${room.coverImageUrl}')` }} />
            <h4>{room.name}</h4>
            <p className="v2-meta">{room.description}</p>
            <div className="v2-tagrow">
              <span className="v2-tag">{room.platform}</span>
              <span className="v2-tag">{room.trackCount} tracks</span>
              <span className="v2-tag">{CURATOR_LABELS.room}</span>
            </div>
            {room.circleSlug && (
              <Link href={V2_ROUTES.circle(room.circleSlug)} className="v2-btn secondary sm" style={{ marginTop: 12 }}>
                View circle
              </Link>
            )}
            <Link href={V2_ROUTES.playlistRoom(room.slug)} className="v2-btn sm" style={{ marginTop: 12 }}>
              Open Curator Room
            </Link>
          </article>
        ))}
      </div>
    </>
  )
}
