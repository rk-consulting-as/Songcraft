'use client'

import type { PlaybackReport } from '@/lib/playback/types'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { formatCompletion } from './playbackUtils'

type Props = {
  report: PlaybackReport
  compact?: boolean
}

export default function PlaybackReportCard({ report, compact }: Props) {
  return (
    <article className="v2-card v2-playback-card v2-playback-report-card">
      <div className="v2-playback-card__head">
        <div>
          <div className="v2-eyebrow">{PLAYBACK_LABELS.evidence} report</div>
          <h4 style={{ margin: '4px 0 0' }}>{report.title}</h4>
        </div>
        <span className="v2-meta">{new Date(report.generatedAt).toLocaleDateString()}</span>
      </div>

      <div className="v2-playback-report-card__stats">
        <div className="v2-stat"><strong>{report.participantCount}</strong><span>participants</span></div>
        <div className="v2-stat"><strong>{report.playbackSessionCount}</strong><span>sessions</span></div>
        <div className="v2-stat"><strong>{formatCompletion(report.averageCompletionRate)}</strong><span>avg completion</span></div>
        <div className="v2-stat"><strong>{report.songsCompleted}</strong><span>songs completed</span></div>
      </div>

      {!compact && (
        <div className="v2-playback-confidence-grid">
          <span className="v2-tag hot">{report.highConfidenceCount} high</span>
          <span className="v2-tag">{report.mediumConfidenceCount} medium</span>
          <span className="v2-tag">{report.lowConfidenceCount} low</span>
          <span className="v2-tag">{report.feedbackCount} feedback</span>
        </div>
      )}

      {(report.topSupporterName || report.topSongTitle || report.topArtistName) && (
        <div className="v2-playback-report-card__highlights">
          {report.topSupporterName && <p className="v2-meta"><b>Top supporter:</b> {report.topSupporterName}</p>}
          {report.topSongTitle && (
            <p className="v2-meta"><b>Top song:</b> {report.topSongTitle}{report.topSongArtist ? ` — ${report.topSongArtist}` : ''}</p>
          )}
          {report.topArtistName && <p className="v2-meta"><b>Top supported artist:</b> {report.topArtistName}</p>}
        </div>
      )}
    </article>
  )
}
