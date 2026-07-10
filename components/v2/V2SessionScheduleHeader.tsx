'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import V2AddToCalendarButton from '@/components/v2/V2AddToCalendarButton'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch, formatV2ApiError } from '@/lib/v2/apiClient'
import {
  formatSessionCountdown,
  formatSessionDateTime,
  formatSessionTime,
  RECURRENCE_LABELS,
} from '@/lib/v2/format'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2RecurrenceRule, V2Session } from '@/lib/v2/types'

type Props = {
  session: V2Session
  isHost?: boolean
  demoMode?: boolean
}

export default function V2SessionScheduleHeader({ session, isHost, demoMode }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [editing, setEditing] = useState(false)
  const [startsAt, setStartsAt] = useState(toLocalInput(session.startsAt))
  const [timezone, setTimezone] = useState(session.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [recurring, setRecurring] = useState(!!session.isRecurring)
  const [recurrence, setRecurrence] = useState<V2RecurrenceRule | ''>((session.recurrenceRule as V2RecurrenceRule) || '')
  const [busy, setBusy] = useState(false)

  const countdown = formatSessionCountdown(session.startsAt, session.status)
  const statusLabel = session.status === 'ended' ? 'Completed' : session.status === 'live' ? 'Live now' : 'Upcoming'

  const saveSchedule = async () => {
    if (demoMode) return
    setBusy(true)
    try {
      await v2ApiFetch(`/api/v2/community/sessions/${session.id}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify({
          starts_at: new Date(startsAt).toISOString(),
          timezone,
          is_recurring: recurring,
          recurrence_rule: recurring && recurrence ? recurrence : null,
        }),
      })
      showToast('Schedule updated')
      setEditing(false)
      router.refresh()
    } catch (e) {
      showToast(formatV2ApiError(e))
    } finally {
      setBusy(false)
    }
  }

  const createNext = async () => {
    if (demoMode) return
    setBusy(true)
    try {
      const res = await v2ApiFetch<{ session: { id: string } }>(`/api/v2/community/sessions/${session.id}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ action: 'next_occurrence' }),
      })
      showToast('Next occurrence created')
      router.push(V2_ROUTES.session(res.session.id))
    } catch (e) {
      showToast(formatV2ApiError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="v2-card v2-schedule-header">
      <div className="v2-schedule-header__top">
        <div>
          <div className="v2-eyebrow">Schedule · {statusLabel}</div>
          {!editing ? (
            <>
              <p className="v2-schedule-header__when">{formatSessionDateTime(session.startsAt, session.timezone)}</p>
              {session.endsAt && (
                <p className="v2-meta">Until {formatSessionTime(session.endsAt, session.timezone)}</p>
              )}
              {session.timezone && <p className="v2-meta">{session.timezone}</p>}
            </>
          ) : (
            <div className="v2-schedule-edit">
              <label className="v2-meta">Start</label>
              <input type="datetime-local" className="v2-input" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
              <label className="v2-meta" style={{ marginTop: 8 }}>Timezone</label>
              <input className="v2-input" value={timezone} onChange={e => setTimezone(e.target.value)} />
              <label className="v2-meta" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
                Make recurring
              </label>
              {recurring && (
                <select className="v2-input" value={recurrence} onChange={e => setRecurrence(e.target.value as V2RecurrenceRule)} style={{ marginTop: 8 }}>
                  <option value="">Select frequency</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>
          )}
        </div>
        {countdown && session.status !== 'ended' && (
          <span className={`v2-tag${session.status === 'live' ? ' hot' : ''}`}>{countdown}</span>
        )}
      </div>

      {session.isRecurring && session.recurrenceRule && (
        <span className="v2-tag">Recurring · {RECURRENCE_LABELS[session.recurrenceRule] || session.recurrenceRule}</span>
      )}

      <div className="v2-hero-actions" style={{ marginTop: 12 }}>
        <V2AddToCalendarButton
          title={session.title}
          startsAt={session.startsAt}
          endsAt={session.endsAt}
          description={`ViaTone Community listening session${session.circleName ? ` · ${session.circleName}` : ''}`}
          url={typeof window !== 'undefined' ? `${window.location.origin}${V2_ROUTES.session(session.id)}` : undefined}
          uid={`viatone-session-${session.id}@viatone.community`}
        />
        {isHost && !editing && (
          <>
            <button type="button" className="v2-btn secondary sm" onClick={() => setEditing(true)}>Edit schedule</button>
            {session.isRecurring && (
              <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={createNext}>Create next occurrence</button>
            )}
          </>
        )}
        {isHost && editing && (
          <>
            <button type="button" className="v2-btn hot sm" disabled={busy} onClick={saveSchedule}>Save</button>
            <button type="button" className="v2-btn secondary sm" onClick={() => setEditing(false)}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
