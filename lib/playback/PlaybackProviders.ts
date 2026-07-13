import type {
  MatchedTrack,
  PlaybackConfidence,
  PlaybackEvidenceInput,
  PlaybackProviderContext,
  PlaybackProviderId,
  PlaylistSnapshotTrack,
} from './types'

/** Provider contract — all external playback sources implement this. */
export interface PlaybackProvider {
  readonly id: PlaybackProviderId
  readonly displayName: string
  /** Whether OAuth/API is wired (Phase 6B+). */
  readonly isConfigured: boolean

  /** Sync remote state — placeholder until OAuth integrations land. */
  sync(ctx: PlaybackProviderContext): Promise<void>

  /** Called when user starts listening. */
  startPlayback(ctx: PlaybackProviderContext): Promise<void>

  /** Called when user finishes — collect final evidence. */
  finishPlayback(ctx: PlaybackProviderContext): Promise<PlaybackEvidenceInput[]>

  /** Collect evidence mid-session or on finish. */
  collectEvidence(ctx: PlaybackProviderContext): Promise<PlaybackEvidenceInput[]>

  /** Match observed tracks against snapshot track list. */
  matchTracks(
    snapshotTracks: PlaylistSnapshotTrack[],
    candidates: PlaybackEvidenceInput[],
  ): Promise<MatchedTrack[]>

  /** Provider-specific confidence for a single evidence row. */
  calculateConfidence(evidence: PlaybackEvidenceInput): PlaybackConfidence
}

export type PlaybackProviderRegistry = Record<PlaybackProviderId, PlaybackProvider>

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Fuzzy title/artist match score 0–1 */
export function scoreTrackMatch(
  a: { title?: string; artist?: string },
  b: { title?: string; artist?: string },
): number {
  const tA = normalize(a.title || '')
  const tB = normalize(b.title || '')
  const rA = normalize(a.artist || '')
  const rB = normalize(b.artist || '')
  if (!tA || !tB) return 0
  const titleMatch = tA === tB || tA.includes(tB) || tB.includes(tA)
  const artistMatch = !rA || !rB || rA === rB || rA.includes(rB) || rB.includes(rA)
  if (titleMatch && artistMatch) return 1
  if (titleMatch) return 0.75
  return 0
}

export function defaultMatchTracks(
  snapshotTracks: PlaylistSnapshotTrack[],
  candidates: PlaybackEvidenceInput[],
  provider: PlaybackProviderId,
): MatchedTrack[] {
  const out: MatchedTrack[] = []
  for (const track of snapshotTracks) {
    let best: MatchedTrack | null = null
    for (const c of candidates) {
      const score = scoreTrackMatch(
        { title: track.title, artist: track.artistName },
        { title: c.trackTitle, artist: c.trackArtist },
      )
      if (score >= 0.75 && (!best || score > best.matchScore)) {
        best = {
          snapshotPosition: track.position,
          snapshotTitle: track.title,
          snapshotArtist: track.artistName,
          matchedTitle: c.trackTitle,
          matchedArtist: c.trackArtist,
          matchScore: score,
          provider,
        }
      }
    }
    if (best) out.push(best)
  }
  return out
}
