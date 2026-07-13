'use client'

import { timeAgo } from '@/lib/v2/format'
import type { PlaybackSession } from '@/lib/playback/types'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { confidenceClass, confidenceLabel, formatCompletion } from './playbackUtils'

type Props = {
  session: PlaybackSession
  showPlatform?: boolean
}

export default function PlaybackSessionCard({ session, showPlatform = true }: Props) {
  const statusLabel = session.status === 'completed'
    ? 'Completed'
    : session.status === 'started'
      ? 'In progress'
      : session.status

  return (
    <article className="v2-card v2-playback-card v2-playback-session-card">
      <div className="v2-playback-card__head">
        <div>
          <div className="v2-eyebrow">{PLAYBACK_LABELS.sessionParticipation}</div>
          <h4 style={{ margin: '4px 0 0' }}>{statusLabel}</h4>
        </div>
        <span className={confidenceClass(session.confidence)}>{confidenceLabel(session.confidence)}</span>
      </div>
      <div className="v2-playback-session-card__stats">
        <div className="v2-stat">
          <strong>{formatCompletion(session.completionRate)}</strong>
          <span>completion</span>
        </div>
        <div className="v2-stat">
          <strong>{session.matchedTrackCount}</strong>
          <span>tracks matched</span>
        </div>
        <div className="v2-stat">
          <strong>{session.expectedTrackCount}</strong>
          <span>expected</span>
        </div>
      </div>
      <p className="v2-meta" style={{ margin: '8px 0 0' }}>
        Started {timeAgo(session.startedAt)}
        {session.endedAt ? ` · ended ${timeAgo(session.endedAt)}` : ''}
        {showPlatform ? ` · ${session.platform}` : ''}
      </p>
    </article>
  )
}
