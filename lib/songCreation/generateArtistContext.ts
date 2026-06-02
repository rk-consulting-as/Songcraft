import type { ArtistProductionProfile } from '@/lib/artistProductionProfiles/types'

export type ArtistContextInput = {
  name?: string | null
  genre?: string | null
  description?: string | null
  song_structure?: string | null
  useProfile: boolean
  productionProfile?: ArtistProductionProfile | null
  useProductionDna: boolean
}

export function generateArtistContext(input: ArtistContextInput): string {
  if (!input.useProfile && !input.useProductionDna) return ''

  const parts: string[] = []
  if (input.useProfile) {
    if (input.name) parts.push(`Artist: ${input.name}`)
    if (input.genre) parts.push(`Genre: ${input.genre}`)
    if (input.description) parts.push(`Artist description: ${input.description}`)
    if (input.song_structure) parts.push(`Song structure / writing profile: ${input.song_structure}`)
  }

  if (input.useProductionDna && input.productionProfile) {
    const p = input.productionProfile
    parts.push(
      [
        'Production DNA (sonic identity — match feel, not copy existing songs):',
        p.label ? `Profile: ${p.label}` : '',
        p.genres.length ? `Genres: ${p.genres.join(', ')}` : '',
        p.traits.length ? `Traits: ${p.traits.join(', ')}` : '',
        p.vocalStyle ? `Vocal style: ${p.vocalStyle}` : '',
        p.instrumentation ? `Instrumentation: ${p.instrumentation}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  return parts.join('\n\n')
}
