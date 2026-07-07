'use client'

import Link from 'next/link'
import { communityHostIntro } from '@/lib/v2/communityExplainer'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2HostDashboard } from '@/lib/v2/types'

type Props = {
  dashboard: V2HostDashboard
}

const CHECKLIST_DONE: Array<(d: V2HostDashboard) => boolean> = [
  (d) => d.circles.length > 0,
  (d) => d.sessions.length > 0,
  (d) => d.playlistRooms.length > 0,
  (d) => d.analytics.songsSubmitted > 0,
  (d) => d.sessions.some((s) => s.status === 'ended') || d.analytics.songsPlayed > 0,
  (d) => d.recentParticipation.length > 0,
]

export default function V2HostIntro({ dashboard }: Props) {
  const { access } = dashboard
  const hasHostPro = access.hostProActive || access.isAdmin

  return (
    <section className="v2-section v2-host-intro" style={{ marginTop: 0 }}>
      <div className="v2-card v2-host-intro__card">
        <div className="v2-eyebrow">Host Pro · Beta</div>
        <h2 className="v2-host-intro__title">{communityHostIntro.title}</h2>
        <p className="v2-meta">{communityHostIntro.intro}</p>

        <div className="v2-host-intro__grid">
          <div>
            <h4 className="v2-host-intro__subhead">Hosts can</h4>
            <ul className="v2-host-intro__can">
              {communityHostIntro.can.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="v2-host-intro__subhead">Your first hosted session</h4>
            <ul className="v2-checklist">
              {communityHostIntro.checklist.map((label, i) => {
                const done = CHECKLIST_DONE[i]?.(dashboard) ?? false
                return (
                  <li key={label} className={done ? 'done' : undefined}>
                    <span className="v2-checklist__mark" aria-hidden>{done ? '✓' : '○'}</span>
                    <span>{label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        {!hasHostPro && (
          <div className="v2-host-intro__upgrade">
            <p className="v2-meta" style={{ margin: '0 0 8px' }}>
              Host Pro unlocks circle creation, session hosting, playlist rooms, recaps and supporter reports.
              {access.showUpgradePrompt ? '' : ' You have host access in beta — create away.'}
            </p>
            <Link href={V2_ROUTES.pricing} className="v2-btn hot sm">Learn about Host Pro</Link>
          </div>
        )}
      </div>
    </section>
  )
}
