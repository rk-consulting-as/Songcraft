'use client'

import Link from 'next/link'
import V2EmptyState from '@/components/v2/V2EmptyState'
import V2SessionAgendaCard from '@/components/v2/V2SessionAgendaCard'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2CalendarSession } from '@/lib/v2/types'

type Props = {
  liveNow: V2CalendarSession[]
  startingSoon: V2CalendarSession[]
  thisWeek: V2CalendarSession[]
  myRsvps: V2CalendarSession[]
  hostingSoon: V2CalendarSession[]
  lowActivity?: boolean
}

export default function V2HomeScheduleBlock({
  liveNow,
  startingSoon,
  thisWeek,
  myRsvps,
  hostingSoon,
  lowActivity,
}: Props) {
  const hasAny = liveNow.length + startingSoon.length + thisWeek.length + myRsvps.length + hostingSoon.length > 0

  if (!hasAny) {
    return (
      <section className="v2-section" style={{ marginTop: 0 }}>
        <V2EmptyState
          icon="📅"
          title={lowActivity ? 'Join your first upcoming session' : 'No sessions scheduled this week'}
          description="Browse the calendar for listening events, RSVP Going, and show up for artists in your circles."
          actionLabel="View Calendar"
          actionHref={V2_ROUTES.calendar}
        />
      </section>
    )
  }

  return (
    <section className="v2-section v2-home-schedule" style={{ marginTop: 0 }}>
      <div className="v2-home-schedule__head">
        <div>
          <div className="v2-eyebrow">Schedule</div>
          <h3 style={{ margin: '6px 0 4px' }}>Upcoming listening events</h3>
        </div>
        <Link href={V2_ROUTES.calendar} className="v2-btn secondary sm">View Calendar</Link>
      </div>

      {liveNow.length > 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">Live now</h4>
          {liveNow.slice(0, 2).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}

      {startingSoon.length > 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">Starting soon</h4>
          {startingSoon.slice(0, 2).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}

      {myRsvps.length > 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">My RSVPs</h4>
          {myRsvps.slice(0, 3).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}

      {hostingSoon.length > 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">Hosting soon</h4>
          {hostingSoon.slice(0, 2).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}

      {thisWeek.length > 0 && liveNow.length === 0 && startingSoon.length === 0 && (
        <div className="v2-home-schedule__block">
          <h4 className="v2-home-schedule__sub">This week</h4>
          {thisWeek.slice(0, 3).map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}
    </section>
  )
}
