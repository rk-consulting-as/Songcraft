'use client'

import Link from 'next/link'
import { timeAgo } from '@/lib/v2/format'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2SessionRecap } from '@/lib/v2/types'

type Props = {
  recap: V2SessionRecap
  circleName?: string
  circleSlug?: string
  /** compact hides host notes + song list for grid placements */
  compact?: boolean
}

export default function V2SessionRecapCard({ recap, circleName, circleSlug, compact }: Props) {
  return (
    <article className="v2-card v2-recap-card">
      <div className="v2-recap-card__head">
        <div>
          <div className="v2-eyebrow">Session recap</div>
          <h4 className="v2-recap-card__title">{recap.title}</h4>
          {circleName && (
            <p className="v2-meta" style={{ margin: '2px 0 0' }}>
              {circleSlug ? (
                <Link href={V2_ROUTES.circle(circleSlug)} style={{ color: 'var(--v2-brand2)' }}>{circleName}</Link>
              ) : circleName}
            </p>
          )}
        </div>
        {recap.completedAt && <span className="v2-meta v2-recap-card__when">{timeAgo(recap.completedAt)}</span>}
      </div>

      <div className="v2-recap-card__stats">
        <div className="v2-stat"><strong>{recap.songsPlayed.length}</strong><span>songs played</span></div>
        <div className="v2-stat"><strong>{recap.participantCount}</strong><span>participants</span></div>
        <div className="v2-stat"><strong>{recap.listenedCount}</strong><span>listening confirmed</span></div>
        <div className="v2-stat"><strong>{recap.feedbackCount}</strong><span>feedback</span></div>
      </div>

      {recap.topSupporters.length > 0 && (
        <div className="v2-recap-card__supporters">
          <span className="v2-meta">Top supporters</span>
          <div className="v2-tagrow" style={{ marginTop: 6 }}>
            {recap.topSupporters.slice(0, 5).map(s => (
              <span key={s.name} className="v2-tag">{s.name}</span>
            ))}
          </div>
        </div>
      )}

      {!compact && recap.hostNotes.length > 0 && (
        <div className="v2-recap-card__notes">
          <span className="v2-meta">Host notes</span>
          {recap.hostNotes.map((note, i) => (
            <p key={i} className="v2-meta v2-recap-card__note">“{note}”</p>
          ))}
        </div>
      )}

      <Link href={V2_ROUTES.session(recap.sessionId)} className="v2-btn secondary sm v2-recap-card__cta">
        Open session
      </Link>
    </article>
  )
}
