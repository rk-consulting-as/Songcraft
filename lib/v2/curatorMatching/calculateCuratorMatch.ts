import type { CuratorMatchResult, CuratorPlaylistDna, CuratorSongMatchContext } from './curatorMatchTypes'

function overlapScore(a: string[] | undefined, b: string[] | undefined): number {
  if (!a?.length || !b?.length) return 0
  const setB = new Set(b.map(s => s.toLowerCase()))
  const hits = a.filter(x => setB.has(x.toLowerCase()) || Array.from(setB).some(y => y.includes(x.toLowerCase()) || x.toLowerCase().includes(y)))
  return hits.length / Math.max(a.length, 1)
}

function dnaMoodScore(room: CuratorPlaylistDna, song: CuratorSongMatchContext): { score: number; note?: string } {
  if (!song.songDna || !room.moods?.length) return { score: 0 }
  const dark = song.songDna.darkness >= 7
  const cinematic = song.songDna.cinematicFeel >= 7
  const story = song.songDna.storytelling >= 7
  const moodHits = room.moods.filter(m => {
    const ml = m.toLowerCase()
    if (ml.includes('dark') && dark) return true
    if (ml.includes('cinematic') && cinematic) return true
    if (ml.includes('story') && story) return true
    return false
  })
  if (!moodHits.length) return { score: 0 }
  return { score: Math.min(1, moodHits.length / room.moods.length), note: moodHits.join(', ') }
}

function tempoScore(room: CuratorPlaylistDna, song: CuratorSongMatchContext): number {
  if (room.tempoMin == null && room.tempoMax == null) return 0
  const energy = song.songDna?.energy ?? 5
  const estimatedBpm = 60 + energy * 12
  const min = room.tempoMin ?? 0
  const max = room.tempoMax ?? 300
  if (estimatedBpm >= min && estimatedBpm <= max) return 1
  const dist = estimatedBpm < min ? min - estimatedBpm : estimatedBpm - max
  return Math.max(0, 1 - dist / 40)
}

/** Deterministic metadata/DNA match — advisory only; curator decides. */
export function calculateCuratorMatch(
  roomDna: CuratorPlaylistDna,
  song: CuratorSongMatchContext,
): CuratorMatchResult {
  const strongestMatches: CuratorMatchResult['strongestMatches'] = []
  const possibleMismatches: CuratorMatchResult['possibleMismatches'] = []

  let total = 0
  let weight = 0

  const genreScore = overlapScore(roomDna.genres, song.genres)
  if (genreScore > 0) {
    total += genreScore * 30
    weight += 30
    strongestMatches.push({ label: 'Genre overlap', detail: 'Shared genre tags between room DNA and song metadata.' })
  } else if (roomDna.genres?.length && song.genres?.length) {
    possibleMismatches.push({ label: 'Genre mismatch', detail: 'Song genres do not clearly match room DNA genres.' })
  }

  const mood = dnaMoodScore(roomDna, song)
  if (mood.score > 0) {
    total += mood.score * 25
    weight += 25
    strongestMatches.push({ label: 'Mood alignment', detail: mood.note || 'Song DNA aligns with room mood profile.' })
  }

  const tempo = tempoScore(roomDna, song)
  if (tempo > 0.5) {
    total += tempo * 20
    weight += 20
    strongestMatches.push({ label: 'Tempo range', detail: 'Estimated energy/tempo sits inside the room range.' })
  } else if (roomDna.tempoMin != null && tempo === 0) {
    possibleMismatches.push({ label: 'Tempo outside range', detail: 'Song energy suggests tempo outside the room BPM window.' })
  }

  if (song.songDna && song.songDna.storytelling >= 7 && roomDna.moods?.some(m => /story/i.test(m))) {
    total += 15
    weight += 15
    strongestMatches.push({ label: 'Story-driven lyrics', detail: 'High storytelling score fits a story-driven room.' })
  }

  if (roomDna.avoid?.length && song.pitch) {
    const pitchLower = song.pitch.toLowerCase()
    const hit = roomDna.avoid.find(a => pitchLower.includes(a.toLowerCase()))
    if (hit) {
      possibleMismatches.push({ label: 'Curator avoid list', detail: `Pitch may conflict with "${hit}".` })
      total -= 10
    }
  }

  const raw = weight > 0 ? total / weight : 0.35
  const overallScore = Math.round(Math.max(0, Math.min(100, raw * 100)))

  const confidence: CuratorMatchResult['confidence'] =
    strongestMatches.length >= 2 && possibleMismatches.length === 0 ? 'high'
      : strongestMatches.length >= 1 ? 'medium' : 'low'

  const matchType: CuratorMatchResult['matchType'] = song.songDna ? 'dna_based' : 'metadata_based'

  return {
    overallScore,
    confidence,
    matchType,
    strongestMatches: strongestMatches.slice(0, 4),
    possibleMismatches: possibleMismatches.slice(0, 3),
    explanation: matchType === 'dna_based'
      ? 'Metadata-based match using Playlist DNA, Song DNA, and curator direction. Curator review required.'
      : 'Metadata-based match from tags and pitch. Curator review required.',
    curatorDecisionRequired: true,
  }
}
