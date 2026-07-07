'use client'

import type { V2SupporterBadge, V2SupporterScoreSummary } from '@/lib/v2/types'

type Props = {
  badges: V2SupporterBadge[]
  compact?: boolean
}

export default function V2SupporterBadges({ badges, compact }: Props) {
  if (!badges.length) {
    return <p className="v2-meta">No badges yet — join a session to get started.</p>
  }

  return (
    <div className={`v2-badge-row${compact ? ' compact' : ''}`}>
      {badges.map(badge => (
        <span key={badge.id} className="v2-supporter-badge" title={badge.description}>
          {badge.label}
        </span>
      ))}
    </div>
  )
}

type ScoreProps = {
  summary: V2SupporterScoreSummary
  compact?: boolean
}

export function V2SupporterScoreGrid({ summary, compact }: ScoreProps) {
  const items = [
    { label: 'Supporter score', value: summary.score, highlight: true },
    { label: 'Sessions joined', value: summary.sessionsJoined },
    { label: 'Listening confirmed', value: summary.sessionsListened },
    { label: 'Feedback given', value: summary.feedbackGiven },
    { label: 'Songs supported', value: summary.songsSupported },
    { label: 'Playlist participation', value: summary.playlistRoomParticipation },
  ]

  return (
    <div className={`v2-grid${compact ? ' cols-3' : ' cols-3'}`} style={{ gap: 12 }}>
      {items.map(item => (
        <div key={item.label} className={`v2-stat${item.highlight ? ' v2-stat--highlight' : ''}`}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
