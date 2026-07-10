'use client'

import Link from 'next/link'
import V2AddToCalendarButton from '@/components/v2/V2AddToCalendarButton'
import { formatSessionCountdown, formatSessionTime } from '@/lib/v2/format'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2CalendarSession, V2RsvpStatus } from '@/lib/v2/types'

const RSVP_LABEL: Record<V2RsvpStatus, string> = {
  going: 'Going',
  interested: 'Interested',
  declined: 'Declined',
}

type Props = {
  session: V2CalendarSession
  onRsvp?: (sessionId: string, status: 'going' | 'interested') => void
  compact?: boolean
}

export default function V2SessionAgendaCard({ session, onRsvp, compact }: Props) {
  const countdown = formatSessionCountdown(session.startsAt, session.status)
  const isLive = session.status === 'live'

  return (
    <article className={`v2-agenda-card${isLive ? ' live' : ''}`}>
      <div className="v2-agenda-card__time">
        <strong>{formatSessionTime(session.startsAt, session.timezone)}</strong>
        {countdown && <span className={`v2-tag sm${isLive ? ' hot' : ''}`}>{countdown}</span>}
      </div>
      <div className="v2-agenda-card__body">
        <h4 className="v2-agenda-card__title">
          <Link href={V2_ROUTES.session(session.id)}>{session.title}</Link>
        </h4>
        <p className="v2-meta">
          {session.hostName}
          {session.circleName ? ` · ${session.circleName}` : ''}
          {` · ${session.platform}`}
        </p>
        {!compact && (
          <div className="v2-agenda-card__meta">
            {(session.rsvpCount ?? 0) > 0 && <span className="v2-tag">{session.rsvpCount} RSVPs</span>}
            {session.isRecurring && <span className="v2-tag">Recurring</span>}
            {session.userRsvpStatus && session.userRsvpStatus !== 'declined' && (
              <span className="v2-tag hot">{RSVP_LABEL[session.userRsvpStatus]}</span>
            )}
            {session.isHosting && <span className="v2-tag">Hosting</span>}
          </div>
        )}
      </div>
      <div className="v2-agenda-card__actions">
        {onRsvp && session.status !== 'ended' && !session.isHosting && (
          <>
            <button type="button" className="v2-btn hot sm" onClick={() => onRsvp(session.id, 'going')}>Going</button>
            <button type="button" className="v2-btn secondary sm" onClick={() => onRsvp(session.id, 'interested')}>Interested</button>
          </>
        )}
        <Link href={V2_ROUTES.session(session.id)} className="v2-btn secondary sm">Open</Link>
        {!compact && (
          <V2AddToCalendarButton
            title={session.title}
            startsAt={session.startsAt}
            endsAt={session.endsAt}
            uid={`viatone-session-${session.id}@viatone.community`}
          />
        )}
      </div>
    </article>
  )
}
