import type { SongDNA } from '@/lib/songDNA/types'
import type { InspirationTrait } from './creativeDirection'

export type InspirationAnalysisFocus =
  | 'themes'
  | 'storytelling'
  | 'atmosphere'
  | 'structure'
  | 'chorusStyle'
  | 'vocabulary'
  | 'melodicFeel'

export const DEFAULT_INSPIRATION_FOCUS: InspirationAnalysisFocus[] = [
  'themes',
  'storytelling',
  'atmosphere',
  'structure',
  'chorusStyle',
  'vocabulary',
]

export type SongReference = {
  id: string
  title: string
  lyrics_instructions?: string | null
  lyrics_text?: string | null
  backstory?: string | null
  song_dna?: SongDNA | null
}

export type SongProposal = {
  title: string
  instructions: string
  genre?: string
  mood?: string
  dna?: SongDNA
}

export type InspirationControls = {
  themes: boolean
  storytelling: boolean
  atmosphere: boolean
  structure: boolean
  chorusStyle: boolean
  vocabulary: boolean
  melodicFeel: boolean
}

export const DEFAULT_INSPIRATION_CONTROLS: InspirationControls = {
  themes: true,
  storytelling: true,
  atmosphere: true,
  structure: true,
  chorusStyle: true,
  vocabulary: true,
  melodicFeel: false,
}

export type GeneratorOptions = {
  useProfile: boolean
  useProductionDna: boolean
  useSongDna: boolean
  inspirationSongIds: string[]
  inspirationControls: InspirationControls
  count: number
  prompt: string
  externalArtists?: string[]
  externalSongs?: string[]
  inspirationTraits?: InspirationTrait[]
  externalUserDirection?: string
}

export type SunoPromptMode = 'compact' | 'detailed'

export const SUNO_HARD_MAX = 1000
export const SUNO_TARGET = 950
export const SUNO_COMPACT_MIN = 500
export const SUNO_COMPACT_MAX = 1000
export const SUNO_DETAILED_MIN = 2000
export const SUNO_DETAILED_MAX = 4000
