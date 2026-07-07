'use client'

import Link from 'next/link'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2WeeklyDigest } from '@/lib/v2/types'

type Props = {
  digest: V2WeeklyDigest
}

export default function V2CommunityDigest({ digest }: Props) {
  const stats = [
    { label: 'sessions joined', value: digest.sessionsJoined },
    { label: 'listening confirmed', value: digest.listeningConfirmations },
    { label: 'feedback given', value: digest.feedbackGiven },
    { label: 'songs supported', value: digest.songsSupported },
    { label: 'room participation', value: digest.playlistRoomParticipation },
  ]

  return (
    <div className="v2-card v2-digest">
      <div className="v2-digest__head">
        <div className="v2-eyebrow">This week in your community</div>
        <h4 style={{ margin: '6px 0 0' }}>Your last 7 days</h4>
      </div>

      {digest.hasActivity ? (
        <>
          <div className="v2-digest__grid">
            {stats.map(s => (
              <div key={s.label} className="v2-stat"><strong>{s.value}</strong><span>{s.label}</span></div>
            ))}
          </div>
          {digest.badgeEarnedThisWeek && (
            <p className="v2-digest__badge">★ You earned the “{digest.badgeEarnedThisWeek}” badge this week.</p>
          )}
        </>
      ) : (
        <div className="v2-digest__empty">
          <p className="v2-meta" style={{ margin: '0 0 12px' }}>
            No activity yet this week. Join a session or leave feedback to start building momentum.
          </p>
          <div className="v2-hero-actions">
            <Link href={V2_ROUTES.sessions} className="v2-btn hot sm">Browse sessions</Link>
            <Link href={V2_ROUTES.circles} className="v2-btn secondary sm">Explore circles</Link>
          </div>
        </div>
      )}
    </div>
  )
}
