import type { PlaylistSnapshot, PlaylistSnapshotTrack } from '@/lib/playback/types'

export type PlaylistDiffChange = {
  type: 'added' | 'removed' | 'reordered' | 'metadata'
  position?: number
  track?: PlaylistSnapshotTrack
  fromPosition?: number
  toPosition?: number
  detail?: string
}

export type PlaylistSnapshotDiff = {
  added: PlaylistSnapshotTrack[]
  removed: PlaylistSnapshotTrack[]
  reordered: Array<{ track: PlaylistSnapshotTrack; from: number; to: number }>
  metadataChanges: string[]
  previousTrackCount: number
  nextTrackCount: number
  durationDeltaSeconds: number
}

function trackKey(t: PlaylistSnapshotTrack): string {
  return t.externalTrackId || `${normalize(t.title)}::${normalize(t.artistName)}`
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function diffPlaylistSnapshots(
  previous: PlaylistSnapshot | null,
  next: PlaylistSnapshot,
): PlaylistSnapshotDiff {
  const prevTracks = previous?.tracks || []
  const nextTracks = next.tracks || []
  const prevMap = new Map(prevTracks.map(t => [trackKey(t), t]))
  const nextMap = new Map(nextTracks.map(t => [trackKey(t), t]))

  const added = nextTracks.filter(t => !prevMap.has(trackKey(t)))
  const removed = prevTracks.filter(t => !nextMap.has(trackKey(t)))

  const reordered: PlaylistSnapshotDiff['reordered'] = []
  for (const t of nextTracks) {
    const prev = prevMap.get(trackKey(t))
    if (prev && prev.position !== t.position) {
      reordered.push({ track: t, from: prev.position, to: t.position })
    }
  }

  const metadataChanges: string[] = []
  if (previous && previous.name !== next.name) metadataChanges.push(`Title: "${previous.name}" → "${next.name}"`)
  if (previous && previous.description !== next.description) metadataChanges.push('Description changed')

  const prevDur = previous?.totalDurationSeconds || 0
  const nextDur = next.totalDurationSeconds || 0

  return {
    added,
    removed,
    reordered,
    metadataChanges,
    previousTrackCount: prevTracks.length,
    nextTrackCount: nextTracks.length,
    durationDeltaSeconds: nextDur - prevDur,
  }
}

export function summarizePlaylistDiff(diff: PlaylistSnapshotDiff): string {
  const parts: string[] = []
  if (diff.added.length) parts.push(`${diff.added.length} added`)
  if (diff.removed.length) parts.push(`${diff.removed.length} removed`)
  if (diff.reordered.length) parts.push(`${diff.reordered.length} reordered`)
  if (!parts.length) return 'No track changes detected'
  return parts.join(', ')
}
