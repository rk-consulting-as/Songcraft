import { clampDnaValue, normalizeSongDNA, type SongDNA } from './types'

export type SongDNAInput = {
  title?: string
  instructions?: string
  lyrics?: string
  genre?: string
  mood?: string
  backstory?: string
}

const DARK_WORDS = /\b(dark|shadow|hell|death|grief|pain|blood|night|swamp|gothic|outlaw|mercy|boots)\b/i
const LIGHT_WORDS = /\b(hope|light|love|triumph|joy|sun|forever|home|mercy|grace)\b/i
const ENERGY_WORDS = /\b(arena|anthem|drive|pulse|rock|aggressive|motivational|fast|power)\b/i
const STORY_WORDS = /\b(story|narrative|chapter|journey|tale|character|verse|scene|cinematic)\b/i
const CHORUS_WORDS = /\b(chorus|hook|singalong|gang vocal|anthem|refrain|crowd)\b/i

function scoreText(text: string, pattern: RegExp, base: number, boost: number): number {
  const matches = text.match(new RegExp(pattern.source, 'gi'))
  return clampDnaValue(base + Math.min(4, (matches?.length || 0) * boost))
}

/** Derive 0–10 DNA scores from song text and metadata (no AI required). */
export function generateSongDNA(input: SongDNAInput): SongDNA {
  const blob = [
    input.title,
    input.instructions,
    input.lyrics?.slice(0, 2000),
    input.genre,
    input.mood,
    input.backstory,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()

  if (!blob.trim()) return normalizeSongDNA(null)

  const darkHits = (blob.match(DARK_WORDS) || []).length
  const lightHits = (blob.match(LIGHT_WORDS) || []).length

  return normalizeSongDNA({
    energy: scoreText(blob, ENERGY_WORDS, 4, 1.2),
    darkness: clampDnaValue(3 + darkHits * 1.5 - lightHits * 0.5),
    emotion: clampDnaValue(5 + Math.min(4, (darkHits + lightHits) * 0.8)),
    storytelling: scoreText(blob, STORY_WORDS, 4, 1.5),
    singalong: scoreText(blob, CHORUS_WORDS, 3, 1.8),
    radioAppeal: clampDnaValue(
      4 +
        (blob.includes('arena') || blob.includes('radio') || blob.includes('hook') ? 3 : 0) +
        (input.genre?.toLowerCase().includes('rock') ? 2 : 0)
    ),
    cinematicFeel: clampDnaValue(
      4 +
        (blob.includes('cinematic') || blob.includes('film') || blob.includes('soundtrack') ? 3 : 0) +
        (input.genre?.toLowerCase().includes('synth') ? 2 : 0)
    ),
  })
}

/** Average DNA across multiple songs (for inspiration context). */
export function averageSongDNA(dnas: SongDNA[]): SongDNA {
  if (!dnas.length) return normalizeSongDNA(null)
  const keys = Object.keys(dnas[0]) as (keyof SongDNA)[]
  const out = {} as SongDNA
  for (const k of keys) {
    const sum = dnas.reduce((s, d) => s + (d[k] || 0), 0)
    out[k] = clampDnaValue(sum / dnas.length)
  }
  return out
}
