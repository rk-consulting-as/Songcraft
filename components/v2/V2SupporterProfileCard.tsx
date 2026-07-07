'use client'

import Link from 'next/link'
import V2SupporterBadges, { V2SupporterScoreGrid } from '@/components/v2/V2SupporterBadges'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2CommunityProfileCard } from '@/lib/v2/types'

type Props = {
  profile: V2CommunityProfileCard
  showHistoryLink?: boolean
  compact?: boolean
}

export default function V2SupporterProfileCard({ profile, showHistoryLink, compact }: Props) {
  return (
    <article className={`v2-card v2-profile-card${compact ? ' compact' : ''}`}>
      <div className="v2-profile-card__head">
        <div className="v2-profile-card__avatar" aria-hidden>{profile.avatarInitial}</div>
        <div>
          <h4 style={{ margin: 0 }}>{profile.displayName}</h4>
          <p className="v2-meta" style={{ margin: '4px 0 0' }}>
            Community participation · not verified streams
          </p>
        </div>
        <div className="v2-profile-card__score">
          <strong>{profile.scoreSummary.score}</strong>
          <span className="v2-meta">supporter score</span>
        </div>
      </div>

      <V2SupporterBadges badges={profile.badges} compact={compact} />

      {!compact && (
        <div style={{ marginTop: 16 }}>
          <V2SupporterScoreGrid summary={profile.scoreSummary} compact />
        </div>
      )}

      {profile.activityEvidenceAvailable && (
        <p className="v2-meta v2-evidence-hint" style={{ marginTop: 12, marginBottom: 0 }}>
          Activity evidence available — Last.fm or playlist campaign logs can support your participation story (not merged yet).
        </p>
      )}

      {showHistoryLink && (
        <div className="v2-hero-actions" style={{ marginTop: 16 }}>
          <Link href={V2_ROUTES.participation} className="v2-btn secondary sm">My participation history</Link>
        </div>
      )}
    </article>
  )
}
