'use client'

import { timeAgo } from '@/lib/v2/format'
import type { PlaybackEvidence, PlaybackSession } from '@/lib/playback/types'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { providerLabel } from './playbackUtils'

type Props = {
  sessions: PlaybackSession[]
  evidence?: PlaybackEvidence[]
}

export default function PlaybackTimeline({ sessions, evidence = [] }: Props) {
  const events = [
    ...sessions.map(s => ({
      id: s.id,
      at: s.startedAt,
      kind: 'session' as const,
      label: s.status === 'completed' ? 'Session completed' : 'Session started',
      detail: `${Math.round(s.completionRate * 100)}% completion · ${s.confidence} confidence`,
    })),
    ...evidence.map(e => ({
      id: e.id,
      at: e.observedAt,
      kind: 'evidence' as const,
      label: PLAYBACK_LABELS.evidence,
      detail: `${e.trackTitle || 'Track'} · ${providerLabel(e.provider)}`,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  if (!events.length) {
    return (
      <div className="v2-card v2-playback-card">
        <div className="v2-eyebrow">Timeline</div>
        <p className="v2-meta" style={{ marginTop: 8 }}>Listening activity will appear here as sessions complete.</p>
      </div>
    )
  }

  return (
    <article className="v2-card v2-playback-card">
      <div className="v2-eyebrow">Listening timeline</div>
      <ol className="v2-playback-timeline">
        {events.slice(0, 12).map(ev => (
          <li key={ev.id} className={`v2-playback-timeline__item v2-playback-timeline__item--${ev.kind}`}>
            <span className="v2-playback-timeline__dot" />
            <div>
              <b>{ev.label}</b>
              <span className="v2-meta">{ev.detail}</span>
              <span className="v2-meta v2-playback-timeline__when">{timeAgo(ev.at)}</span>
            </div>
          </li>
        ))}
      </ol>
    </article>
  )
}
