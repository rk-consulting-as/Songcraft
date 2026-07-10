'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import V2EmptyState from '@/components/v2/V2EmptyState'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionAgendaCard from '@/components/v2/V2SessionAgendaCard'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch, formatV2ApiError } from '@/lib/v2/apiClient'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2CalendarDayGroup, V2CalendarView } from '@/lib/v2/types'

type Props = {
  initialGroups: V2CalendarDayGroup[]
  initialView: V2CalendarView
  fromMock?: boolean
  userId: string | null
}

const TABS: { id: V2CalendarView; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'this_week', label: 'This week' },
  { id: 'my_sessions', label: 'My sessions' },
  { id: 'hosting', label: 'Hosting' },
]

const EMPTY: Record<V2CalendarView, { title: string; desc: string; cta: string; href: string }> = {
  upcoming: {
    title: 'No upcoming sessions',
    desc: 'Listening events will show up here as hosts schedule them. Join a circle to discover what is coming next.',
    cta: 'Browse sessions',
    href: V2_ROUTES.sessions,
  },
  this_week: {
    title: 'Nothing scheduled this week',
    desc: 'Check back soon or explore circles for sessions being planned.',
    cta: 'Explore circles',
    href: V2_ROUTES.circles,
  },
  my_sessions: {
    title: 'No RSVPs yet',
    desc: 'RSVP Going or Interested on a session to see it here.',
    cta: 'View upcoming',
    href: V2_ROUTES.calendar,
  },
  hosting: {
    title: 'No hosted schedule',
    desc: 'Create a session from the Host Dashboard and set a date to build your listening calendar.',
    cta: 'Host a session',
    href: V2_ROUTES.host,
  },
}

export default function V2CalendarClient({ initialGroups, initialView, fromMock, userId }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [view, setView] = useState(initialView)
  const [groups, setGroups] = useState(initialGroups)

  const switchView = async (next: V2CalendarView) => {
    setView(next)
    try {
      const res = await fetch(`/api/v2/community/calendar?view=${next}`)
      if (res.ok) {
        const data = await res.json()
        setGroups(data.groups || [])
      }
    } catch {
      // keep current groups
    }
  }

  const rsvp = async (sessionId: string, status: 'going' | 'interested') => {
    if (!userId) {
      showToast('Log in to RSVP')
      return
    }
    try {
      await v2ApiFetch(`/api/v2/community/sessions/${sessionId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
      showToast(status === 'going' ? "You're going!" : 'Marked as interested')
      router.refresh()
      await switchView(view)
    } catch (e) {
      showToast(formatV2ApiError(e))
    }
  }

  const empty = EMPTY[view]
  const hasSessions = groups.some(g => g.sessions.length > 0)

  return (
    <>
      <V2SectionHeader
        title="Community Calendar"
        lead="Upcoming listening sessions — RSVP, plan ahead, and show up for artists."
        action={<Link href={V2_ROUTES.host} className="v2-btn hot sm">Schedule a session</Link>}
      />

      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>Demo schedule — seed migrations for live session dates.</p>
      )}

      <div className="v2-calendar-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            className={`v2-btn sm${view === tab.id ? ' hot' : ' secondary'}`}
            onClick={() => switchView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!hasSessions ? (
        <V2EmptyState icon="📅" title={empty.title} description={empty.desc} actionLabel={empty.cta} actionHref={empty.href} />
      ) : (
        <div className="v2-calendar-agenda">
          {groups.map(group => (
            <section key={group.dateKey} className="v2-calendar-day">
              <h3 className="v2-calendar-day__label">{group.label}</h3>
              <div className="v2-calendar-day__list">
                {group.sessions.map(session => (
                  <V2SessionAgendaCard key={session.id} session={session} onRsvp={userId ? rsvp : undefined} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
