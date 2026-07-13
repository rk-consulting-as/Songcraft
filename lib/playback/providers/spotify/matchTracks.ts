import type { PlaybackEvidenceInput, PlaylistSnapshotTrack } from '@/lib/playback/types'
import type { SpotifyRecentlyPlayedItem } from '@/lib/spotify/playlistApi'
import { scoreTrackMatch } from '@/lib/playback/PlaybackProviders'

export type SpotifyMatchResult = {
  snapshotPosition?: number
  snapshotTitle: string
  snapshotArtist: string
  playedAt: string
  matchType: 'spotify_id' | 'uri' | 'isrc' | 'title_artist' | 'fuzzy'
  matchScore: number
  trackId: string
  trackTitle: string
  trackArtist: string
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function matchRecentlyPlayedToSnapshot(
  snapshotTracks: PlaylistSnapshotTrack[],
  recentlyPlayed: SpotifyRecentlyPlayedItem[],
  window?: { start: string; end: string },
): SpotifyMatchResult[] {
  const startMs = window?.start ? new Date(window.start).getTime() : 0
  const endMs = window?.end ? new Date(window.end).getTime() : Date.now() + 60_000

  const inWindow = recentlyPlayed.filter(r => {
    const t = new Date(r.playedAt).getTime()
    return t >= startMs - 5 * 60_000 && t <= endMs + 5 * 60_000
  })

  const results: SpotifyMatchResult[] = []
  const usedPlayed = new Set<string>()

  for (const snap of snapshotTracks) {
    let best: SpotifyMatchResult | null = null

    for (const play of inWindow) {
      const key = `${play.trackId}:${play.playedAt}`
      if (usedPlayed.has(key)) continue

      let matchType: SpotifyMatchResult['matchType'] | null = null
      let matchScore = 0

      if (snap.externalTrackId && play.trackId === snap.externalTrackId) {
        matchType = 'spotify_id'
        matchScore = 1
      } else if (snap.isrc && play.isrc && snap.isrc === play.isrc) {
        matchType = 'isrc'
        matchScore = 0.95
      } else {
        const fuzzy = scoreTrackMatch(
          { title: snap.title, artist: snap.artistName },
          { title: play.title, artist: play.artist },
        )
        if (fuzzy >= 0.75) {
          matchType = fuzzy >= 1 ? 'title_artist' : 'fuzzy'
          matchScore = fuzzy
        }
      }

      if (matchType && (!best || matchScore > best.matchScore)) {
        best = {
          snapshotPosition: snap.position,
          snapshotTitle: snap.title,
          snapshotArtist: snap.artistName,
          playedAt: play.playedAt,
          matchType,
          matchScore,
          trackId: play.trackId,
          trackTitle: play.title,
          trackArtist: play.artist,
        }
      }
    }

    if (best) {
      usedPlayed.add(`${best.trackId}:${best.playedAt}`)
      results.push(best)
    }
  }

  return results
}

export function matchesToEvidenceInputs(matches: SpotifyMatchResult[]): PlaybackEvidenceInput[] {
  return matches.map(m => ({
    provider: 'spotify',
    evidenceType: 'recently_played',
    trackPosition: m.snapshotPosition,
    trackExternalId: m.trackId,
    trackTitle: m.trackTitle,
    trackArtist: m.trackArtist,
    observedAt: m.playedAt,
    metadata: {
      matchType: m.matchType,
      matchScore: m.matchScore,
      source: 'spotify_recently_played',
      disclaimer: 'Recently Played match — does not prove playlist source or official stream count',
    },
  }))
}

export function scoreSpotifyMatchCoverage(
  snapshotTrackCount: number,
  matches: SpotifyMatchResult[],
): { coverage: number; confidence: 'high' | 'medium' | 'low' | 'unknown' } {
  if (!snapshotTrackCount || !matches.length) return { coverage: 0, confidence: 'unknown' }
  const uniquePositions = new Set(matches.map(m => m.snapshotPosition).filter(Boolean))
  const coverage = uniquePositions.size / snapshotTrackCount
  const exact = matches.filter(m => m.matchType === 'spotify_id' || m.matchType === 'isrc').length
  if (exact >= 3 && coverage >= 0.4) return { coverage, confidence: 'high' }
  if (exact >= 1 && coverage >= 0.15) return { coverage, confidence: 'medium' }
  if (matches.length >= 1) return { coverage, confidence: 'low' }
  return { coverage, confidence: 'unknown' }
}
