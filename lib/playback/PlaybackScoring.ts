import type { PlaybackConfidence, PlaybackEvidenceInput } from './types'

const PROVIDER_BASE_SCORE: Record<string, number> = {
  spotify: 0.85,
  youtube: 0.8,
  lastfm: 0.75,
  viatone: 0.9,
  manual: 0.45,
  apple: 0.85,
  tidal: 0.85,
  deezer: 0.8,
  soundcloud: 0.75,
  amazon: 0.8,
}

const EVIDENCE_TYPE_BOOST: Record<string, number> = {
  recently_played: 0.1,
  scrobble: 0.08,
  watch_history: 0.08,
  stream_engine: 0.12,
  manual_confirm: 0,
  participation_confirm: 0.05,
  playlist_snapshot_match: 0.06,
}

/** Map numeric score to confidence band. */
export function scoreToConfidence(score: number): PlaybackConfidence {
  if (score >= 0.8) return 'high'
  if (score >= 0.55) return 'medium'
  if (score >= 0.3) return 'low'
  return 'unknown'
}

/** Score a single evidence row from provider + type. */
export function scoreEvidenceRow(input: PlaybackEvidenceInput): number {
  const base = PROVIDER_BASE_SCORE[input.provider] ?? 0.4
  const boost = EVIDENCE_TYPE_BOOST[input.evidenceType] ?? 0
  const explicit = input.confidenceScore ?? 0
  return Math.min(1, Math.max(explicit, base + boost))
}

/** Aggregate session confidence from multiple evidence sources per track position. */
export function aggregateSessionConfidence(
  evidence: PlaybackEvidenceInput[],
  expectedTracks: number,
): { confidence: PlaybackConfidence; completionRate: number; matchedCount: number } {
  if (!evidence.length) {
    return { confidence: 'unknown', completionRate: 0, matchedCount: 0 }
  }

  const byPosition = new Map<number, PlaybackEvidenceInput[]>()
  for (const e of evidence) {
    const pos = e.trackPosition ?? -1
    if (pos < 0) continue
    const list = byPosition.get(pos) || []
    list.push(e)
    byPosition.set(pos, list)
  }

  const matchedCount = byPosition.size
  const completionRate = expectedTracks > 0 ? matchedCount / expectedTracks : 0

  let highSources = 0
  let mediumSources = 0
  for (const rows of Array.from(byPosition.values())) {
    const providers = new Set(rows.map((r: PlaybackEvidenceInput) => r.provider))
    const scores = rows.map(scoreEvidenceRow)
    const maxScore = Math.max(...scores)
    if (providers.size >= 2 && maxScore >= 0.7) highSources += 1
    else if (maxScore >= 0.55) mediumSources += 1
  }

  let confidence: PlaybackConfidence = 'low'
  if (highSources >= Math.max(1, Math.floor(matchedCount * 0.5))) confidence = 'high'
  else if (mediumSources >= Math.max(1, Math.floor(matchedCount * 0.4))) confidence = 'medium'
  else if (matchedCount > 0) confidence = 'low'
  else confidence = 'unknown'

  return { confidence, completionRate, matchedCount }
}

/** Count evidence rows by confidence band. */
export function countByConfidence(evidence: PlaybackEvidenceInput[]): {
  high: number
  medium: number
  low: number
  unknown: number
} {
  const counts = { high: 0, medium: 0, low: 0, unknown: 0 }
  for (const e of evidence) {
    const band = e.confidence || scoreToConfidence(scoreEvidenceRow(e))
    counts[band] += 1
  }
  return counts
}
