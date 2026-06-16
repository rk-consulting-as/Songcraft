import { aiOutputLanguageDirective } from '@/lib/aiOutputLanguage'
import type { AIOutputLang } from '@/lib/aiOutputLanguage'
import { generateSongDNA } from '@/lib/songDNA/generateSongDNA'
import { normalizeSongDNA } from '@/lib/songDNA/types'
import { generateArtistContext } from './generateArtistContext'
import {
  formatSongDnaContext,
  generateSongReferencesContext,
} from './generateSongReferences'
import type { ArtistContextInput } from './generateArtistContext'
import type { GeneratorOptions, SongProposal, SongReference } from './types'
import { buildExternalInspirationContext, EXTERNAL_INSPIRATION_SAFETY_RULE } from './creativeDirection'
import type { CreativeDirection } from './creativeDirection'

export function buildConceptGenerationSystem(
  count: number,
  aiOutputLang: AIOutputLang,
  useSongStructure: boolean
): string {
  return [
    aiOutputLanguageDirective(aiOutputLang),
    'You are a professional songwriting assistant for music creators.',
    `Create EXACTLY ${count} original song proposals.`,
    'Each proposal must feel consistent with the artist identity but be entirely new material.',
    'Do not copy titles, lyrics, melodies, or hooks from reference songs.',
    EXTERNAL_INSPIRATION_SAFETY_RULE,
    'If external artist/song references are provided, translate them into broad genre, mood, structure, energy, and atmosphere traits — never imitate a specific work.',
    'Respond ONLY with valid JSON array, no markdown:',
    '[',
    '  {',
    '    "title": "Song title",',
    '    "instructions": "Detailed songwriter brief: theme, mood, verse structure, imagery, chorus idea, tone. 3-5 sentences.",',
    '    "genre": "Primary genre label",',
    '    "mood": "One-word or short mood",',
    '    "dna": { "energy": 0-10, "darkness": 0-10, "emotion": 0-10, "storytelling": 0-10, "singalong": 0-10, "radioAppeal": 0-10, "cinematicFeel": 0-10 }',
    '  }',
    ']',
    useSongStructure ? 'Follow the artist song structure profile when provided.' : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildConceptGenerationUserMessage(
  options: GeneratorOptions,
  artistInput: ArtistContextInput,
  referenceSongs: SongReference[],
  referenceDnaOverride?: ReturnType<typeof generateSongReferencesContext>['referenceDna']
): string {
  const parts: string[] = []

  const artistCtx = generateArtistContext(artistInput)
  if (artistCtx) parts.push(artistCtx)

  const { context: refCtx, referenceDna } = generateSongReferencesContext(
    referenceSongs,
    options.inspirationControls
  )
  if (refCtx) parts.push(refCtx)

  const dnaSource = options.useSongDna ? referenceDnaOverride ?? referenceDna : null
  if (dnaSource) parts.push(formatSongDnaContext(dnaSource))

  parts.push(`User creative direction: ${options.prompt}`)
  parts.push(`Number of songs: ${options.count}`)

  const externalDirection: CreativeDirection = {
    external_reference_artists: options.externalArtists,
    external_reference_songs: options.externalSongs,
    inspiration_traits: options.inspirationTraits,
    user_direction: options.externalUserDirection,
  }
  const externalCtx = buildExternalInspirationContext(externalDirection)
  if (externalCtx) parts.push(externalCtx)

  return parts.join('\n\n')
}

export function parseConceptResponse(raw: string, count: number): SongProposal[] {
  const clean = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean) as SongProposal[]
  if (!Array.isArray(parsed)) throw new Error('invalid_response')

  return parsed.slice(0, count).map(item => {
    const dna = item.dna ? normalizeSongDNA(item.dna) : generateSongDNA({
      title: item.title,
      instructions: item.instructions,
      genre: item.genre,
      mood: item.mood,
    })
    return {
      title: String(item.title || 'Untitled').trim(),
      instructions: String(item.instructions || '').trim(),
      genre: item.genre ? String(item.genre).trim() : undefined,
      mood: item.mood ? String(item.mood).trim() : undefined,
      dna,
    }
  })
}

export type ConceptGenerationPayload = {
  system: string
  userMessage: string
}

export function prepareConceptGeneration(
  options: GeneratorOptions,
  artistInput: ArtistContextInput,
  referenceSongs: SongReference[],
  aiOutputLang: AIOutputLang
): ConceptGenerationPayload {
  const useStructure = !!(artistInput.useProfile && artistInput.song_structure)
  return {
    system: buildConceptGenerationSystem(options.count, aiOutputLang, useStructure),
    userMessage: buildConceptGenerationUserMessage(options, artistInput, referenceSongs),
  }
}