import type { SongDNA } from '@/lib/songDNA/types'

export type CuratorAiIdentity = 'human' | 'ai_assisted' | 'fully_ai' | 'hybrid' | 'any'

export type CuratorPlaylistDna = {
  genres?: string[]
  moods?: string[]
  energyLevel?: 'low' | 'medium' | 'high' | 'varied'
  tempoMin?: number
  tempoMax?: number
  vocalPreference?: 'instrumental' | 'vocals' | 'any'
  instrumentation?: string[]
  lyricalThemes?: string[]
  productionStyle?: string[]
  languagePreference?: string[]
  explicitContent?: 'allowed' | 'clean_only' | 'no_preference'
  acceptedAiIdentity?: CuratorAiIdentity[]
  curatorDirection?: string
  avoid?: string[]
}

export type CuratorSongMatchContext = {
  title: string
  artistName: string
  pitch?: string
  genres?: string[]
  songDna?: SongDNA
  creationType?: string
  lyricalThemes?: string[]
  productionNotes?: string
}

export type CuratorMatchStrength = {
  label: string
  detail: string
}

export type CuratorMatchResult = {
  overallScore: number
  confidence: 'high' | 'medium' | 'low'
  matchType: 'metadata_based' | 'dna_based' | 'rule_based'
  strongestMatches: CuratorMatchStrength[]
  possibleMismatches: CuratorMatchStrength[]
  explanation: string
  curatorDecisionRequired: true
}
