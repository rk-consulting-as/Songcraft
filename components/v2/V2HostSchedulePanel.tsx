'use client'

import Link from 'next/link'
import V2EmptyState from '@/components/v2/V2EmptyState'
import V2SessionAgendaCard from '@/components/v2/V2SessionAgendaCard'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2CalendarSession } from '@/lib/v2/types'

type Props = {
  thisWeek: V2CalendarSession[]
  undated: V2CalendarSession[]
  needsParticipants: V2CalendarSession[]
  startingSoon: V2CalendarSession[]
}

export default function V2HostSchedulePanel({ thisWeek, undated, needsParticipants, startingSoon }: Props) {
  const hasAny = thisWeek.length + undated.length + needsParticipants.length + startingSoon.length > 0

  if (!hasAny) {
    return (
      <V2EmptyState
        icon="📅"
        title="No hosted schedule yet"
        description="Schedule a session with a date and time so your circle knows when to show up."
        actionLabel="Schedule a session"
        actionHref={V2_ROUTES.host}
      />
    )
  }

  return (
    <div className="v2-host-schedule">
      {startingSoon.length > 0 && (
        <div className="v2-host-schedule__block">
          <h4 className="v2-home-schedule__sub">Starting soon</h4>
          {startingSoon.map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}
      {needsParticipants.length > 0 && (
        <div className="v2-host-schedule__block">
          <h4 className="v2-home-schedule__sub">Needs participants</h4>
          {needsParticipants.map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}
      {thisWeek.length > 0 && (
        <div className="v2-host-schedule__block">
          <h4 className="v2-home-schedule__sub">This week</h4>
          {thisWeek.map(s => <V2SessionAgendaCard key={s.id} session={s} compact />)}
        </div>
      )}
      {undated.length > 0 && (
        <div className="v2-host-schedule__block">
          <h4 className="v2-home-schedule__sub">Set date & time</h4>
          <p className="v2-meta">These sessions need a scheduled start time.</p>
          {undated.map(s => (
            <div key={s.id} className="v2-track">
              <span className="num">◷</span>
              <div><b>{s.title}</b><span>No date set</span></div>
              <Link href={V2_ROUTES.session(s.id)} className="v2-btn sm secondary">Schedule</Link>
            </div>
          ))}
        </div>
      )}
      <Link href={V2_ROUTES.calendar} className="v2-btn secondary sm" style={{ marginTop: 12 }}>View full calendar</Link>
    </div>
  )
}
