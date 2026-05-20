import type { AiConfidence } from '@/lib/playlistCommunities/activityTypes'
import type { LastfmScrobble } from './client'
import type { PlaylistTrackRef } from './playlistTracks'

export type MatchedScrobble = {
  playlistPosition: number
  playlistTrack: PlaylistTrackRef
  scrobble: LastfmScrobble
  method: 'spotify_id' | 'title_artist' | 'fuzzy'
}

export type ListeningSession = {
  startIso: string
  endIso: string
  durationMinutes: number
  matchCount: number
}

export type LastfmImportAnalysis = {
  matched: MatchedScrobble[]
  completionPercent: number
  confidence: AiConfidence
  summaryText: string
  explanation: string
  clusterCount: number
  sequenceMatches: number
  sessions: ListeningSession[]
  primarySession: ListeningSession | null
}

/** Group matched scrobbles into listening sessions (default 45 min window). */
export function detectListeningSessions(
  matched: MatchedScrobble[],
  windowMs = 45 * 60 * 1000
): ListeningSession[] {
  if (matched.length === 0) return []
  const sorted = [...matched].sort((a, b) => a.scrobble.playedAt.getTime() - b.scrobble.playedAt.getTime())
  const sessions: ListeningSession[] = []
  let i = 0
  while (i < sorted.length) {
    const start = sorted[i].scrobble.playedAt.getTime()
    let end = start
    let count = 1
    let j = i + 1
    while (j < sorted.length && sorted[j].scrobble.playedAt.getTime() - start <= windowMs) {
      end = sorted[j].scrobble.playedAt.getTime()
      count += 1
      j += 1
    }
    if (count >= 2) {
      sessions.push({
        startIso: new Date(start).toISOString(),
        endIso: new Date(end).toISOString(),
        durationMinutes: Math.max(1, Math.round((end - start) / 60000)),
        matchCount: count,
      })
    }
    i = j
  }
  return sessions.sort((a, b) => b.matchCount - a.matchCount)
}

export function normalizeMatchKey(artist: string, track: string): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/feat\.?|ft\.?/gi, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  return `${clean(artist)}::${clean(track)}`
}

function titlesSimilar(a: string, b: string): boolean {
  const na = normalizeMatchKey('', a).replace(/^::/, '')
  const nb = normalizeMatchKey('', b).replace(/^::/, '')
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  const minLen = Math.min(na.length, nb.length)
  if (minLen >= 8 && (na.startsWith(nb) || nb.startsWith(na))) return true
  return false
}

function matchScrobbleToTrack(scrobble: LastfmScrobble, track: PlaylistTrackRef): MatchedScrobble['method'] | null {
  if (scrobble.spotifyTrackId && track.spotifyId && scrobble.spotifyTrackId === track.spotifyId) {
    return 'spotify_id'
  }
  const scKey = normalizeMatchKey(scrobble.artist, scrobble.track)
  const plKey = normalizeMatchKey(track.artist, track.name)
  if (scKey === plKey) return 'title_artist'

  const scArtist = normalizeMatchKey(scrobble.artist, '').replace(/^::/, '')
  const plArtist = normalizeMatchKey(track.artist, '').replace(/^::/, '')
  const artistOk =
    scArtist === plArtist ||
    scArtist.includes(plArtist) ||
    plArtist.includes(scArtist) ||
    scrobble.artist.split(/[,&]/).some(p => normalizeMatchKey(p.trim(), '') === plArtist)

  if (artistOk && titlesSimilar(scrobble.track, track.name)) return 'fuzzy'
  return null
}

function countClusters(matched: MatchedScrobble[], windowMs = 45 * 60 * 1000): number {
  if (matched.length < 2) return 0
  const sorted = [...matched].sort((a, b) => a.scrobble.playedAt.getTime() - b.scrobble.playedAt.getTime())
  let clusters = 0
  let i = 0
  while (i < sorted.length) {
    const start = sorted[i].scrobble.playedAt.getTime()
    let count = 1
    let j = i + 1
    while (j < sorted.length && sorted[j].scrobble.playedAt.getTime() - start <= windowMs) {
      count += 1
      j += 1
    }
    if (count >= 2) clusters += 1
    i = j
  }
  return clusters
}

function countSequenceMatches(matched: MatchedScrobble[], playlistTracks: PlaylistTrackRef[]): number {
  const positions = Array.from(new Set(matched.map(m => m.playlistPosition))).sort((a, b) => a - b)
  if (positions.length < 3) return 0
  const byTime = [...matched].sort((a, b) => a.scrobble.playedAt.getTime() - b.scrobble.playedAt.getTime())
  const seen = new Set<number>()
  const ordered: number[] = []
  for (const m of byTime) {
    if (seen.has(m.playlistPosition)) continue
    seen.add(m.playlistPosition)
    ordered.push(m.playlistPosition)
  }
  let best = 0
  for (let start = 0; start < playlistTracks.length; start++) {
    let seq = 0
    let lastPos = -1
    for (const pos of ordered) {
      const idx = playlistTracks.findIndex(t => t.position === pos)
      if (idx >= start && idx > lastPos) {
        seq += 1
        lastPos = idx
      }
    }
    if (seq > best) best = seq
  }
  return best >= 3 ? best : 0
}

function computeConfidence(
  matchedCount: number,
  totalTracks: number,
  clusterCount: number,
  sequenceMatches: number,
  hasSpotifyMatches: boolean
): AiConfidence {
  if (matchedCount === 0) return 'unclear'
  const pct = totalTracks > 0 ? matchedCount / totalTracks : 0
  if (pct >= 0.5 && (clusterCount >= 1 || sequenceMatches >= 3 || hasSpotifyMatches)) return 'high'
  if (pct >= 0.35 || (matchedCount >= 3 && clusterCount >= 1)) return 'high'
  if (pct >= 0.2 || matchedCount >= 2 || clusterCount >= 1 || sequenceMatches >= 2) return 'medium'
  if (matchedCount >= 1) return 'low'
  return 'unclear'
}

function formatTimestamp(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 16)
}

export function analyzeLastfmPlaylistActivity(
  playlistTracks: PlaylistTrackRef[],
  scrobbles: LastfmScrobble[],
  opts: { username: string; fromDate: string; toDate: string }
): LastfmImportAnalysis {
  const matched: MatchedScrobble[] = []
  const usedScrobble = new Set<number>()

  for (const track of playlistTracks) {
    for (let si = 0; si < scrobbles.length; si++) {
      if (usedScrobble.has(si)) continue
      const method = matchScrobbleToTrack(scrobbles[si], track)
      if (method) {
        matched.push({
          playlistPosition: track.position,
          playlistTrack: track,
          scrobble: scrobbles[si],
          method,
        })
        usedScrobble.add(si)
        break
      }
    }
  }

  const uniquePositions = new Set(matched.map(m => m.playlistPosition))
  const uniqueCount = uniquePositions.size
  const total = playlistTracks.length
  const completionPercent = total > 0 ? Math.round((uniqueCount / total) * 100) : 0
  const clusterCount = countClusters(matched)
  const sequenceMatches = countSequenceMatches(matched, playlistTracks)
  const sessions = detectListeningSessions(matched)
  const primarySession = sessions[0] || null
  const hasSpotifyMatches = matched.some(m => m.method === 'spotify_id')
  const confidence = computeConfidence(uniqueCount, total, clusterCount, sequenceMatches, hasSpotifyMatches)

  const lines: string[] = [
    `Last.fm import — ${opts.username}`,
    `Period: ${opts.fromDate} → ${opts.toDate}`,
    `Playlist tracks matched: ${uniqueCount} / ${total} (${completionPercent}%)`,
    `Confidence: ${confidence.toUpperCase()}`,
    `Listening clusters (45 min): ${clusterCount}`,
  ]
  if (sequenceMatches >= 3) {
    lines.push(`Playlist order signal: ${sequenceMatches} tracks in likely sequence`)
  }
  lines.push('')
  if (matched.length === 0) {
    lines.push('No scrobbles matched playlist tracks in this period.')
  } else {
    lines.push('Matched scrobbles:')
    const sorted = [...matched].sort((a, b) => a.scrobble.playedAt.getTime() - b.scrobble.playedAt.getTime())
    for (const m of sorted.slice(0, 40)) {
      lines.push(
        `- [${m.method}] ${m.scrobble.artist} — ${m.scrobble.track} @ ${formatTimestamp(m.scrobble.playedAt)} (playlist #${m.playlistPosition}: ${m.playlistTrack.name})`
      )
    }
    if (sorted.length > 40) lines.push(`… and ${sorted.length - 40} more matches`)
  }
  lines.push('')
  lines.push(
    'Disclaimer: This is Last.fm activity evidence. It does not verify actual Spotify streams or playlist adds.'
  )

  const explanation = [
    `Compared ${scrobbles.length} Last.fm scrobbles against ${total} playlist tracks.`,
    uniqueCount
      ? `Found ${uniqueCount} likely playlist listens (${completionPercent}% coverage).`
      : 'No reliable playlist track matches in the selected window.',
    clusterCount ? `${clusterCount} listening cluster(s) suggest focused playlist session(s).` : '',
    confidence === 'high'
      ? 'Strong overlap — good participation evidence for owner review.'
      : confidence === 'medium'
        ? 'Moderate overlap — useful context; owner should confirm.'
        : confidence === 'low'
          ? 'Weak overlap — treat as supplementary notes only.'
          : 'Insufficient signal — owner may request manual proof.',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    matched,
    completionPercent,
    confidence,
    summaryText: lines.join('\n'),
    explanation,
    clusterCount,
    sequenceMatches,
    sessions,
    primarySession,
  }
}
