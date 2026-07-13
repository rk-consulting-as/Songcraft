'use client'

import type { PlaybackEvidence } from '@/lib/playback/types'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { confidenceClass, confidenceLabel, providerLabel } from './playbackUtils'

type Props = {
  evidence: PlaybackEvidence[]
  compact?: boolean
}

export default function PlaybackEvidenceCard({ evidence, compact }: Props) {
  if (!evidence.length) {
    return (
      <div className="v2-card v2-playback-card">
        <div className="v2-eyebrow">{PLAYBACK_LABELS.evidence}</div>
        <p className="v2-meta" style={{ margin: '8px 0 0' }}>
          No playback evidence collected yet. Finish a listening session to gather evidence from connected sources.
        </p>
      </div>
    )
  }

  const rows = compact ? evidence.slice(0, 4) : evidence

  return (
    <article className="v2-card v2-playback-card">
      <div className="v2-playback-card__head">
        <div className="v2-eyebrow">{PLAYBACK_LABELS.evidence}</div>
        <span className="v2-meta">{evidence.length} source{evidence.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="v2-playback-evidence-list">
        {rows.map(row => (
          <li key={row.id} className="v2-playback-evidence-row">
            <div>
              <b>{row.trackTitle || 'Track match'}</b>
              <span className="v2-meta">
                {row.trackArtist || 'Unknown artist'} · {providerLabel(row.provider)}
              </span>
            </div>
            <span className={confidenceClass(row.confidence)}>{confidenceLabel(row.confidence)}</span>
          </li>
        ))}
      </ul>
      {compact && evidence.length > rows.length && (
        <p className="v2-meta" style={{ marginTop: 8 }}>+{evidence.length - rows.length} more evidence rows</p>
      )}
    </article>
  )
}
