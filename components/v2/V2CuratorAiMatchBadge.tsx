'use client'

import type { CuratorMatchResult } from '@/lib/v2/curatorMatching/curatorMatchTypes'
import { CURATOR_LABELS } from '@/lib/v2/types'

type Props = {
  match?: CuratorMatchResult | null
  compact?: boolean
}

export default function V2CuratorAiMatchBadge({ match, compact }: Props) {
  if (!match) return null

  const scoreClass = match.overallScore >= 75 ? 'high' : match.overallScore >= 50 ? 'medium' : 'low'

  return (
    <div className={`v2-curator-match v2-curator-match--${scoreClass}${compact ? ' compact' : ''}`}>
      <div className="v2-curator-match__head">
        <span className="v2-eyebrow">{CURATOR_LABELS.aiMatch}</span>
        <strong>{match.overallScore}%</strong>
      </div>
      <p className="v2-meta">{CURATOR_LABELS.aiMatchAdvisory} · {match.explanation}</p>
      <span className="v2-tag">Curator decision required</span>
      {!compact && match.strongestMatches.length > 0 && (
        <ul className="v2-curator-match__list">
          {match.strongestMatches.map(m => (
            <li key={m.label}><b>{m.label}</b> — {m.detail}</li>
          ))}
        </ul>
      )}
      {!compact && match.possibleMismatches.length > 0 && (
        <ul className="v2-curator-match__list v2-curator-match__list--warn">
          {match.possibleMismatches.map(m => (
            <li key={m.label}><b>{m.label}</b> — {m.detail}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
