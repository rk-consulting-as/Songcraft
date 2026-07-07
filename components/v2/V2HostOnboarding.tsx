'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { dismissHostOnboarding, isHostOnboardingDismissed } from '@/lib/v2/onboardingStorage'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2HostDashboard } from '@/lib/v2/types'

type Props = {
  dashboard: V2HostDashboard
}

const HOST_CHECKLIST = [
  { key: 'circle', label: 'Create a circle', done: (d: V2HostDashboard) => d.circles.length > 0 },
  { key: 'session', label: 'Schedule a session', done: (d: V2HostDashboard) => d.sessions.length > 0 },
  { key: 'room', label: 'Open a playlist room', done: (d: V2HostDashboard) => d.playlistRooms.length > 0 },
  { key: 'approve', label: 'Approve a submission', done: (d: V2HostDashboard) => d.analytics.songsSubmitted > 0 && d.pendingSubmissions.length < d.analytics.songsSubmitted },
  { key: 'live', label: 'Start and end a live session', done: (d: V2HostDashboard) => d.sessions.some(s => s.status === 'ended') || d.analytics.songsPlayed > 0 },
  { key: 'recap', label: 'Review session recap', done: (d: V2HostDashboard) => d.recentParticipation.length > 0 },
]

export default function V2HostOnboarding({ dashboard }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!isHostOnboardingDismissed())
  }, [])

  if (!visible) return null

  const dismiss = () => {
    dismissHostOnboarding()
    setVisible(false)
  }

  const completed = HOST_CHECKLIST.filter(item => item.done(dashboard)).length

  return (
    <section className="v2-section" style={{ marginTop: 0 }}>
      <div className="v2-card v2-onboarding-card v2-host-onboarding">
        <div className="v2-onboarding-card__head">
          <div>
            <div className="v2-eyebrow">Host Pro · Beta</div>
            <h3 style={{ margin: '6px 0 8px' }}>Curator quick start</h3>
            <p className="v2-meta" style={{ margin: 0 }}>
              Host circles, sessions and playlist rooms. Manual Stream Engine playback — approve submissions, go live, end with recap.
            </p>
          </div>
          <button type="button" className="v2-btn secondary sm" onClick={dismiss}>Dismiss</button>
        </div>

        <div className="v2-onboarding-steps" style={{ marginTop: 16 }}>
          <div className="v2-onboarding-step">
            <strong>Create resources</strong>
            <span className="v2-meta">Circle → session → playlist room (link to your circle when useful).</span>
          </div>
          <div className="v2-onboarding-step">
            <strong>Run a session</strong>
            <span className="v2-meta">Approve queue items, start session, mark songs played, end with recap.</span>
          </div>
          <div className="v2-onboarding-step">
            <strong>Track participation</strong>
            <span className="v2-meta">See listeners, feedback and supporter activity in analytics.</span>
          </div>
        </div>

        <div className="v2-guided-actions" style={{ marginTop: 16, padding: 0, background: 'transparent', border: 0 }}>
          <div className="v2-guided-actions__head">
            <h4 style={{ margin: 0, fontSize: 14 }}>First hosted session checklist</h4>
            <span className="v2-meta">{completed} / {HOST_CHECKLIST.length}</span>
          </div>
          <ul className="v2-checklist">
            {HOST_CHECKLIST.map(item => (
              <li key={item.key} className={item.done(dashboard) ? 'done' : undefined}>
                <span className="v2-checklist__mark" aria-hidden>{item.done(dashboard) ? '✓' : '○'}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="v2-hero-actions" style={{ marginTop: 16 }}>
          <Link href={V2_ROUTES.pricing} className="v2-btn secondary sm">Host Pro plans</Link>
          <button type="button" className="v2-btn hot sm" onClick={dismiss}>Start hosting</button>
        </div>
      </div>
    </section>
  )
}
