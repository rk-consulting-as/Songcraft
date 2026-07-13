'use client'

import type { PlaylistSnapshot } from '@/lib/playback/types'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { formatDuration } from './playbackUtils'

type Props = {
  snapshot: PlaylistSnapshot
  maxTracks?: number
}

export default function PlaylistSnapshotViewer({ snapshot, maxTracks = 12 }: Props) {
  const tracks = snapshot.tracks.slice(0, maxTracks)

  return (
    <article className="v2-card v2-playback-card">
      <div className="v2-playback-card__head">
        <div>
          <div className="v2-eyebrow">Immutable snapshot · {snapshot.platform}</div>
          <h4 style={{ margin: '4px 0 0' }}>{snapshot.name}</h4>
          {snapshot.description && <p className="v2-meta" style={{ margin: '4px 0 0' }}>{snapshot.description}</p>}
        </div>
        <span className="v2-tag">{snapshot.trackCount} tracks</span>
      </div>
      <p className="v2-meta" style={{ margin: '0 0 12px' }}>
        {PLAYBACK_LABELS.playlistParticipation} · captured {new Date(snapshot.snapshotAt).toLocaleString()}
        {snapshot.totalDurationSeconds > 0 ? ` · ${formatDuration(snapshot.totalDurationSeconds)}` : ''}
      </p>
      <div className="v2-playback-snapshot-tracks">
        {tracks.map(t => (
          <div key={`${t.position}-${t.title}`} className="v2-track">
            <span className="num">{t.position}</span>
            <div><b>{t.title}</b><span>{t.artistName}</span></div>
          </div>
        ))}
      </div>
      {snapshot.tracks.length > tracks.length && (
        <p className="v2-meta" style={{ marginTop: 8 }}>+{snapshot.tracks.length - tracks.length} more tracks in snapshot</p>
      )}
    </article>
  )
}
