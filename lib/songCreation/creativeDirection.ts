import { canonicalTitleDirective, canonicalTitleUserLine } from '@/lib/songs/canonicalTitle'

export const INSPIRATION_TRAIT_KEYS = [
  'mood',
  'energy',
  'structure',
  'instrumentation',
  'vocal_style',
  'rhythm_groove',
  'atmosphere',
  'lyrical_themes',
  'production_style',
] as const

export type InspirationTrait = typeof INSPIRATION_TRAIT_KEYS[number]

export type CreativeDirection = {
  artist_profile_used?: boolean
  production_dna_used?: boolean
  internal_reference_song_ids?: string[]
  internal_reference_song_titles?: string[]
  external_reference_artists?: string[]
  external_reference_songs?: string[]
  inspiration_traits?: InspirationTrait[]
  user_direction?: string
  original_generation_prompt?: string
  generated_concept_summary?: string
  updated_at?: string
}

export const EXTERNAL_INSPIRATION_SAFETY_RULE = [
  'Use referenced artists/songs only as broad creative inspiration.',
  'Do not copy lyrics, melodies, hooks, riffs, or other distinctive protected expression.',
  'Translate famous references into genre, mood, structure, energy, instrumentation, vocal attitude, and atmosphere — never imitate a specific recorded work.',
  'Create an original work.',
].join(' ')

export function sanitizeExternalReferences(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 24)
}

export function parseCreativeDirection(publishContent: unknown): CreativeDirection | null {
  if (!publishContent || typeof publishContent !== 'object') return null
  const cd = (publishContent as Record<string, unknown>).creative_direction
  if (!cd || typeof cd !== 'object') return null
  return normalizeCreativeDirection(cd as Record<string, unknown>)
}

export function normalizeCreativeDirection(raw: Record<string, unknown>): CreativeDirection {
  const traits = Array.isArray(raw.inspiration_traits)
    ? raw.inspiration_traits.filter((t): t is InspirationTrait =>
      typeof t === 'string' && (INSPIRATION_TRAIT_KEYS as readonly string[]).includes(t),
    )
    : undefined

  return {
    artist_profile_used: !!raw.artist_profile_used,
    production_dna_used: !!raw.production_dna_used,
    internal_reference_song_ids: Array.isArray(raw.internal_reference_song_ids)
      ? raw.internal_reference_song_ids.map(String)
      : undefined,
    internal_reference_song_titles: Array.isArray(raw.internal_reference_song_titles)
      ? raw.internal_reference_song_titles.map(String)
      : undefined,
    external_reference_artists: Array.isArray(raw.external_reference_artists)
      ? raw.external_reference_artists.map(String)
      : undefined,
    external_reference_songs: Array.isArray(raw.external_reference_songs)
      ? raw.external_reference_songs.map(String)
      : undefined,
    inspiration_traits: traits,
    user_direction: typeof raw.user_direction === 'string' ? raw.user_direction.trim() : undefined,
    original_generation_prompt: typeof raw.original_generation_prompt === 'string'
      ? raw.original_generation_prompt.trim()
      : undefined,
    generated_concept_summary: typeof raw.generated_concept_summary === 'string'
      ? raw.generated_concept_summary.trim()
      : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  }
}

const TRAIT_AI_LABELS: Record<InspirationTrait, string> = {
  mood: 'mood and emotional tone',
  energy: 'energy and intensity',
  structure: 'song structure and arrangement arc',
  instrumentation: 'instrumentation choices',
  vocal_style: 'vocal style and attitude',
  rhythm_groove: 'rhythm and groove',
  atmosphere: 'atmosphere and sonic texture',
  lyrical_themes: 'lyrical themes (original wording only)',
  production_style: 'production style and mix feel',
}

/** Safe high-level phrasing for external references — no "sound like X". */
export function buildExternalInspirationContext(direction: CreativeDirection | null | undefined): string {
  if (!direction) return ''

  const parts: string[] = []

  if (direction.external_reference_artists?.length) {
    parts.push(
      `External artist inspiration (translate to broad traits only, never imitate): ${direction.external_reference_artists.join(', ')}.`,
      'Infer only public musical characteristics such as genre family, typical energy, instrumentation palette, vocal attitude, and atmosphere.',
    )
  }

  if (direction.external_reference_songs?.length) {
    parts.push(
      `External song inspiration (traits only — no melody/lyrics/hooks): ${direction.external_reference_songs.join(', ')}.`,
      'Translate each song reference into structure, tension/release, groove feel, thematic mood, and production texture — not specific riffs or lyrics.',
    )
  }

  if (direction.inspiration_traits?.length) {
    const labels = direction.inspiration_traits.map(t => TRAIT_AI_LABELS[t] || t)
    parts.push(`Borrow these dimensions from the references: ${labels.join(', ')}.`)
  }

  if (direction.user_direction?.trim()) {
    parts.push(`Creator notes: ${direction.user_direction.trim()}`)
  }

  return parts.join('\n')
}

export function buildContinuityInstruction(): string {
  return [
    'Maintain the original creative direction of this song.',
    'Do not drift into a different genre, mood, title, or concept unless the user explicitly asks.',
    'Stay aligned with the stored creative direction and song concept throughout the output.',
  ].join(' ')
}

export function buildCreativeDirectionContext(
  song?: {
    title?: string | null
    lyrics_instructions?: string | null
    proposal_meta?: { genre?: string; mood?: string } | null
  } | null,
  artist?: { name?: string | null; genre?: string | null; song_structure?: string | null } | null,
  direction?: CreativeDirection | null,
): string {
  const parts: string[] = []

  if (direction?.generated_concept_summary) {
    parts.push(`Song concept summary:\n${direction.generated_concept_summary}`)
  } else if (song?.lyrics_instructions?.trim()) {
    parts.push(`Song concept / instructions:\n${song.lyrics_instructions.trim()}`)
  }

  if (direction?.original_generation_prompt) {
    parts.push(`Original creation prompt:\n${direction.original_generation_prompt}`)
  }

  if (direction?.internal_reference_song_titles?.length) {
    parts.push(`Internal catalog references (style only): ${direction.internal_reference_song_titles.join(', ')}`)
  }

  if (direction?.artist_profile_used && artist) {
    const artistBits = [artist.name, artist.genre, artist.song_structure].filter(Boolean)
    if (artistBits.length) parts.push(`Artist profile context: ${artistBits.join(' · ')}`)
  }

  const genre = song?.proposal_meta?.genre || artist?.genre
  const mood = song?.proposal_meta?.mood
  if (genre) parts.push(`Target genre: ${genre}`)
  if (mood) parts.push(`Target mood: ${mood}`)

  const external = buildExternalInspirationContext(direction)
  if (external) parts.push(external)

  return parts.filter(Boolean).join('\n\n')
}

export function buildCreativeDirectionUserPrefix(
  canonicalTitle: string,
  direction?: CreativeDirection | null,
  song?: Parameters<typeof buildCreativeDirectionContext>[0],
  artist?: Parameters<typeof buildCreativeDirectionContext>[1],
): string {
  return [
    canonicalTitleUserLine(canonicalTitle),
    buildCreativeDirectionContext(song, artist, direction),
  ].filter(Boolean).join('\n\n')
}

export function buildSongAiSystemPrompt(
  baseSystem: string,
  options: {
    canonicalTitle?: string
    creativeDirection?: CreativeDirection | null
    song?: Parameters<typeof buildCreativeDirectionContext>[0]
    artist?: Parameters<typeof buildCreativeDirectionContext>[1]
    includeContinuity?: boolean
  },
): string {
  const includeContinuity = options.includeContinuity !== false
  return [
    baseSystem,
    options.canonicalTitle ? canonicalTitleDirective(options.canonicalTitle) : '',
    includeContinuity ? buildContinuityInstruction() : '',
    EXTERNAL_INSPIRATION_SAFETY_RULE,
    buildCreativeDirectionContext(options.song, options.artist, options.creativeDirection),
  ].filter(Boolean).join('\n\n')
}

export function buildCreativeDirectionPayload(input: {
  artistProfileUsed: boolean
  productionDnaUsed: boolean
  internalReferenceSongIds: string[]
  internalReferenceSongTitles: string[]
  externalArtists: string[]
  externalSongs: string[]
  inspirationTraits: InspirationTrait[]
  userDirection: string
  originalPrompt: string
  generatedConceptSummary?: string
}): CreativeDirection {
  return {
    artist_profile_used: input.artistProfileUsed,
    production_dna_used: input.productionDnaUsed,
    internal_reference_song_ids: input.internalReferenceSongIds,
    internal_reference_song_titles: input.internalReferenceSongTitles,
    external_reference_artists: input.externalArtists,
    external_reference_songs: input.externalSongs,
    inspiration_traits: input.inspirationTraits,
    user_direction: input.userDirection || undefined,
    original_generation_prompt: input.originalPrompt || undefined,
    generated_concept_summary: input.generatedConceptSummary,
    updated_at: new Date().toISOString(),
  }
}

export function mergePublishContentCreativeDirection(
  publishContent: Record<string, unknown>,
  direction: CreativeDirection,
): Record<string, unknown> {
  return {
    ...publishContent,
    creative_direction: {
      ...direction,
      updated_at: new Date().toISOString(),
    },
  }
}

/** Keep compact Suno prompt aligned with creative direction and <= hardMax chars. */
export function alignSunoPromptToDirection(
  compact: string,
  direction: CreativeDirection | null | undefined,
  hardMax = 1000,
): string {
  let out = compact.trim()
  const disclaimer = 'Original song; no copied melodies or lyrics.'
  const anchorParts: string[] = []

  if (direction?.generated_concept_summary) {
    anchorParts.push(direction.generated_concept_summary.replace(/\s+/g, ' ').slice(0, 160))
  }
  const external = buildExternalInspirationContext(direction)
  if (external) anchorParts.push(external.replace(/\s+/g, ' ').slice(0, 220))

  const anchor = anchorParts.join(' ').trim()
  if (anchor && !out.toLowerCase().includes(anchor.slice(0, 32).toLowerCase())) {
    out = `${anchor} ${out}`.trim()
  }
  if (!/original song/i.test(out)) {
    out = `${out} ${disclaimer}`.trim()
  }
  if (out.length > hardMax) {
    out = out.slice(0, hardMax - 1).trim()
  }
  return out
}

export function hasCreativeDirectionContent(direction: CreativeDirection | null | undefined): boolean {
  if (!direction) return false
  return !!(
    direction.generated_concept_summary
    || direction.user_direction
    || direction.original_generation_prompt
    || direction.external_reference_artists?.length
    || direction.external_reference_songs?.length
    || direction.internal_reference_song_titles?.length
    || direction.inspiration_traits?.length
  )
}
