import type { PlaylistSnapshotTrack } from '@/lib/playback/types'
import type { SpotifyMatchResult } from './matchTracks'
import type { SpotifyRecentlyPlayedItem } from '@/lib/spotify/playlistApi'
import { matchRecentlyPlayedToSnapshot } from './matchTracks'

export type QueueItemWindow = {
  snapshotId: string
  playlistTitle?: string
  startedAt: string
  endedAt: string
}

export type QueueMatchBucket = {
  snapshotId: string
  playlistTitle?: string
  matches: SpotifyMatchResult[]
  ambiguous: SpotifyMatchResult[]
  coverage: number
  confidence: 'high' | 'medium' | 'low' | 'unknown'
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/** Match Recently Played to queue items using per-item time windows; avoid double-crediting. */
export function matchRecentlyPlayedToQueue(
  items: Array<QueueItemWindow & { tracks: PlaylistSnapshotTrack[] }>,
  recentlyPlayed: SpotifyRecentlyPlayedItem[],
): QueueMatchBucket[] {
  const buckets: QueueMatchBucket[] = items.map(item => ({
    snapshotId: item.snapshotId,
    playlistTitle: item.playlistTitle,
    matches: [],
    ambiguous: [],
    coverage: 0,
    confidence: 'unknown' as const,
  }))

  const claimed = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const window = { start: item.startedAt, end: item.endedAt }
    const raw = matchRecentlyPlayedToSnapshot(item.tracks, recentlyPlayed, window)

    for (const m of raw) {
      const key = `${m.trackId}:${m.playedAt}`
      if (claimed.has(key)) {
        buckets[i].ambiguous.push(m)
        continue
      }
      claimed.add(key)
      buckets[i].matches.push(m)
    }

    const unique = new Set(buckets[i].matches.map(m => m.snapshotPosition).filter(Boolean))
    buckets[i].coverage = item.tracks.length ? unique.size / item.tracks.length : 0
    const exact = buckets[i].matches.filter(m => m.matchType === 'spotify_id' || m.matchType === 'isrc').length
    if (exact >= 3 && buckets[i].coverage >= 0.4) buckets[i].confidence = 'high'
    else if (exact >= 1) buckets[i].confidence = 'medium'
    else if (buckets[i].matches.length) buckets[i].confidence = 'low'
  }

  return buckets
}

export function detectQueueAmbiguity(
  buckets: QueueMatchBucket[],
): Array<{ trackId: string; playedAt: string; snapshotIds: string[] }> {
  const byKey = new Map<string, Set<string>>()
  for (const b of buckets) {
    for (const m of [...b.matches, ...b.ambiguous]) {
      const key = `${m.trackId}:${m.playedAt}`
      const set = byKey.get(key) || new Set()
      set.add(b.snapshotId)
      byKey.set(key, set)
    }
  }
  return Array.from(byKey.entries())
    .filter(([, ids]) => ids.size > 1)
    .map(([key, ids]) => {
      const [trackId, playedAt] = key.split(':')
      return { trackId, playedAt, snapshotIds: Array.from(ids) }
    })
}
