'use client'

import Link from 'next/link'
import V2SessionAgendaCard from '@/components/v2/V2SessionAgendaCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2Circle, V2PlaylistRoom, V2Session } from '@/lib/v2/types'

type Props = {
  circleSessions: V2Session[]
  hostSessions: V2Session[]
  followedCircles: V2Circle[]
  savedSessions: V2Session[]
  savedRooms: V2PlaylistRoom[]
}

export default function V2CommunityFollowsBlock({
  circleSessions,
  hostSessions,
  followedCircles,
  savedSessions,
  savedRooms,
}: Props) {
  const hasFollowed = circleSessions.length + hostSessions.length + followedCircles.length > 0
  const hasSaved = savedSessions.length + savedRooms.length > 0
  if (!hasFollowed && !hasSaved) return null

  const hostSessionsUnique = hostSessions.filter(s => !circleSessions.some(c => c.id === s.id))

  return (
    <section className="v2-section v2-follows-block">
      <V2SectionHeader
        title="From your follows & saves"
        lead="Sessions and rooms you are tracking."
        action={<Link href={V2_ROUTES.saved} className="v2-btn secondary sm">View all</Link>}
      />

      {circleSessions.length > 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">From circles you follow</h4>
          {circleSessions.slice(0, 3).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}

      {hostSessionsUnique.length > 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">From hosts you follow</h4>
          {hostSessionsUnique.slice(0, 3).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}

      {savedSessions.length > 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">Saved sessions</h4>
          {savedSessions.slice(0, 3).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}

      {savedRooms.length > 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">Saved playlist rooms</h4>
          <div className="v2-grid cols-2">
            {savedRooms.slice(0, 4).map(room => (
              <Link key={room.id} href={V2_ROUTES.playlistRoom(room.slug)} className="v2-card">
                <h4 style={{ margin: '0 0 4px' }}>{room.name}</h4>
                <p className="v2-meta">{room.platform} · {room.trackCount} tracks</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
