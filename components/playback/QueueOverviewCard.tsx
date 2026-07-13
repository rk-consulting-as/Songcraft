'use client'

import type { PlaybackQueue } from '@/lib/playback/types'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { formatDuration } from './playbackUtils'

type Props = {
  queue: PlaybackQueue
  onStart?: () => void
  onFinish?: () => void
  busy?: boolean
}

export default function QueueOverviewCard({ queue, onStart, onFinish, busy }: Props) {
  return (
    <article className="v2-card v2-playback-card">
      <div className="v2-playback-card__head">
        <div>
          <div className="v2-eyebrow">Listening queue</div>
          <h4 style={{ margin: '4px 0 0' }}>{queue.name}</h4>
        </div>
        <span className="v2-tag">{queue.status}</span>
      </div>

      <div className="v2-playback-session-card__stats">
        <div className="v2-stat"><strong>{formatDuration(queue.estimatedDurationSeconds)}</strong><span>estimated</span></div>
        <div className="v2-stat"><strong>{queue.estimatedTrackCount}</strong><span>tracks</span></div>
        <div className="v2-stat"><strong>{queue.items.length}</strong><span>playlists</span></div>
      </div>

      <ol className="v2-playback-queue-list">
        {queue.items.map(item => (
          <li key={`${item.position}-${item.snapshotId}`} className="v2-playback-queue-item">
            <span className="num">{item.position}</span>
            <div><b>{item.snapshotName}</b><span>{item.trackCount} tracks</span></div>
          </li>
        ))}
      </ol>

      <p className="v2-meta" style={{ margin: '12px 0' }}>
        {PLAYBACK_LABELS.evidence} is aggregated when the full queue completes.
      </p>

      {(onStart || onFinish) && (
        <div className="v2-hero-actions">
          {onStart && queue.status === 'draft' && (
            <button type="button" className="v2-btn hot sm" disabled={busy} onClick={onStart}>Start queue</button>
          )}
          {onFinish && queue.status === 'active' && (
            <button type="button" className="v2-btn secondary sm" disabled={busy} onClick={onFinish}>Finish queue</button>
          )}
        </div>
      )}
    </article>
  )
}
