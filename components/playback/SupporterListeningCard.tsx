'use client'

import type { PlaybackReport } from '@/lib/playback/types'
import { PLAYBACK_LABELS } from '@/lib/playback/types'

type SupporterRow = {
  name: string
  score?: number | string
  badge?: string
}

type Props = {
  supporters?: SupporterRow[]
  report?: PlaybackReport | null
}

export default function SupporterListeningCard({ supporters = [], report }: Props) {
  const topName = report?.topSupporterName
  const rows = supporters.length
    ? supporters
    : topName
      ? [{ name: topName, badge: 'Top supporter' }]
      : []

  return (
    <article className="v2-card v2-playback-card">
      <div className="v2-eyebrow">{PLAYBACK_LABELS.participation}</div>
      <h4 style={{ margin: '4px 0 12px' }}>Most active supporters</h4>

      {rows.length === 0 ? (
        <p className="v2-meta">Supporter listening activity will rank here as playback evidence accumulates.</p>
      ) : (
        <div className="v2-playback-supporters">
          {rows.slice(0, 6).map(row => (
            <div key={row.name} className="v2-track">
              <span className="num">★</span>
              <div><b>{row.name}</b><span>{row.badge || 'Community listener'}</span></div>
              {row.score != null && <span className="v2-meta">{row.score}</span>}
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
