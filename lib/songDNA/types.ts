export const SONG_DNA_DIMENSIONS = [
  'energy',
  'darkness',
  'emotion',
  'storytelling',
  'singalong',
  'radioAppeal',
  'cinematicFeel',
] as const

export type SongDNADimension = (typeof SONG_DNA_DIMENSIONS)[number]

export type SongDNA = Record<SongDNADimension, number>

export const EMPTY_SONG_DNA: SongDNA = {
  energy: 5,
  darkness: 5,
  emotion: 5,
  storytelling: 5,
  singalong: 5,
  radioAppeal: 5,
  cinematicFeel: 5,
}

export function clampDnaValue(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)))
}

export function normalizeSongDNA(raw: Partial<Record<string, number>> | null | undefined): SongDNA {
  const out = { ...EMPTY_SONG_DNA }
  if (!raw) return out
  for (const key of SONG_DNA_DIMENSIONS) {
    const v = raw[key]
    if (typeof v === 'number' && !Number.isNaN(v)) out[key] = clampDnaValue(v)
  }
  return out
}
