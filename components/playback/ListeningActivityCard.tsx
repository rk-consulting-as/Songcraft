'use client'

import type { PlaybackContextSummary } from '@/lib/playback/data/fetchPlaybackContext'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { formatCompletion } from './playbackUtils'
import PlaybackSessionCard from './PlaybackSessionCard'

type Props = {
  summary: PlaybackContextSummary
  title?: string
}

export default function ListeningActivityCard({ summary, title }: Props) {
  if (!summary.available) {
    return (
      <div className="v2-card v2-playback-card">
        <div className="v2-eyebrow">{PLAYBACK_LABELS.activity}</div>
        <p className="v2-meta" style={{ marginTop: 8 }}>
          Playback evidence will appear after the migration is applied and listeners complete sessions.
        </p>
      </div>
    )
  }

  const hasData = summary.sessionCount > 0 || summary.report

  return (
    <article className="v2-card v2-playback-card">
      <div className="v2-playback-card__head">
        <div>
          <div className="v2-eyebrow">{PLAYBACK_LABELS.participation}</div>
          <h4 style={{ margin: '4px 0 0' }}>{title || PLAYBACK_LABELS.activity}</h4>
        </div>
      </div>

      {hasData ? (
        <>
          <div className="v2-playback-session-card__stats">
            <div className="v2-stat"><strong>{summary.sessionCount}</strong><span>sessions</span></div>
            <div className="v2-stat"><strong>{summary.highConfidenceCount}</strong><span>high confidence</span></div>
            <div className="v2-stat"><strong>{formatCompletion(summary.averageCompletion)}</strong><span>avg completion</span></div>
          </div>
          {summary.sessions.slice(0, 2).map(s => (
            <div key={s.id} style={{ marginTop: 12 }}>
              <PlaybackSessionCard session={s} />
            </div>
          ))}
        </>
      ) : (
        <p className="v2-meta" style={{ marginTop: 8 }}>
          No completed listening sessions yet. Press Start Listening to begin collecting playback evidence.
        </p>
      )}
    </article>
  )
}
