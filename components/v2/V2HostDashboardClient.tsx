'use client'

import Link from 'next/link'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2HostCreatePanel from '@/components/v2/V2HostCreatePanel'
import V2HostPendingPanel from '@/components/v2/V2HostPendingPanel'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionCard from '@/components/v2/V2SessionCard'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2HostDashboard } from '@/lib/v2/types'

type Props = {
  dashboard: V2HostDashboard
}

export default function V2HostDashboardClient({ dashboard }: Props) {
  const { access, circles, sessions, playlistRooms, pendingSubmissions, upcomingSessions, recentParticipation, analytics } = dashboard

  return (
    <>
      <V2SectionHeader
        title="Host dashboard"
        lead="Curator tools for circles, sessions and playlist rooms — powered by Stream Engine beta."
        action={
          <div className="v2-hero-actions">
            {access.isAdmin && <span className="v2-tag">Admin</span>}
            {access.hostProActive && <span className="v2-tag hot">Host Pro</span>}
            <Link href={V2_ROUTES.pricing} className="v2-btn secondary sm">Plans</Link>
          </div>
        }
      />

      {access.showUpgradePrompt && !access.isExistingHost && (
        <div className="v2-card v2-host-upgrade" style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 8px' }}>Become a Host</h4>
          <p className="v2-meta">Host Pro unlocks circle creation, session hosting, playlist rooms, recaps and supporter reports.</p>
          <Link href={V2_ROUTES.pricing} className="v2-btn hot sm">View Host Pro</Link>
        </div>
      )}

      <section className="v2-section" style={{ marginTop: 0 }}>
        <V2SectionHeader title="Host analytics" lead="Participation across your hosted listening rooms." />
        <div className="v2-grid cols-3">
          <div className="v2-stat"><strong>{analytics.totalParticipants}</strong><span>total participants</span></div>
          <div className="v2-stat"><strong>{analytics.songsSubmitted}</strong><span>songs submitted</span></div>
          <div className="v2-stat"><strong>{analytics.songsPlayed}</strong><span>songs played</span></div>
          <div className="v2-stat"><strong>{analytics.feedbackCount}</strong><span>feedback count</span></div>
          <div className="v2-stat"><strong>{analytics.completionRate}%</strong><span>session completion</span></div>
          <div className="v2-stat"><strong>{pendingSubmissions.length}</strong><span>pending reviews</span></div>
        </div>
        {access.canViewSupporterReports && analytics.topSupporters.length > 0 && (
          <div className="v2-card" style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 8px' }}>Top supporters</h4>
            {analytics.topSupporters.map(s => (
              <div key={s.id} className="v2-track">
                <span className="num">★</span>
                <div><b>{s.name}</b><span>{s.badge || 'Supporter'}</span></div>
                <span>{s.score}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <V2HostCreatePanel access={access} circles={circles.map(c => ({ id: c.id, name: c.name }))} />

      <section className="v2-section">
        <V2SectionHeader title="Pending submissions" lead="Approve or remove tracks before they enter the queue." />
        <V2HostPendingPanel submissions={pendingSubmissions} />
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Upcoming sessions" action={<Link href={V2_ROUTES.sessions} className="v2-btn secondary sm">All sessions</Link>} />
        <div className="v2-grid cols-2">
          {upcomingSessions.length === 0 && <p className="v2-meta">No upcoming sessions — create one above.</p>}
          {upcomingSessions.map(session => (
            <V2SessionCard key={session.id} session={session} />
          ))}
        </div>
      </section>

      <div className="v2-grid cols-2">
        <section className="v2-section">
          <V2SectionHeader title="My circles" />
          <div className="v2-grid" style={{ gap: 12 }}>
            {circles.length === 0 && <p className="v2-meta">No circles yet.</p>}
            {circles.map(circle => <V2CircleCard key={circle.id} circle={circle} />)}
          </div>
        </section>
        <section className="v2-section">
          <V2SectionHeader title="My playlist rooms" action={<Link href={V2_ROUTES.playlists} className="v2-btn secondary sm">All rooms</Link>} />
          <div className="v2-card">
            {playlistRooms.length === 0 && <p className="v2-meta">No playlist rooms yet.</p>}
            {playlistRooms.map(room => (
              <div key={room.id} className="v2-track">
                <span className="num">♫</span>
                <div><b>{room.name}</b><span>{room.trackCount} tracks · {room.roundStatus || 'active'}</span></div>
                <Link href={V2_ROUTES.playlistRoom(room.slug)} className="v2-btn sm secondary">Manage</Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="v2-section">
        <V2SectionHeader title="Recent participation" lead="Listener activity in your sessions." />
        <div className="v2-card">
          {recentParticipation.length === 0 && <p className="v2-meta">No participation logged yet.</p>}
          {recentParticipation.map(row => (
            <div key={row.sessionId} className="v2-track">
              <span className="num">◎</span>
              <div>
                <b>{row.sessionTitle}</b>
                <span>{row.participantCount} joined · {row.listenedCount} listening confirmed</span>
              </div>
              <Link href={V2_ROUTES.session(row.sessionId)} className="v2-btn sm secondary">Recap</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader title="All hosted sessions" />
        <div className="v2-card">
          {sessions.length === 0 && <p className="v2-meta">You have not hosted any sessions yet.</p>}
          {sessions.slice(0, 12).map(session => (
            <div key={session.id} className="v2-track">
              <span className="num">{session.status === 'live' ? '●' : '○'}</span>
              <div><b>{session.title}</b><span>{session.status} · {session.joinedCount} joined</span></div>
              <Link href={V2_ROUTES.session(session.id)} className="v2-btn sm secondary">Manage</Link>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
