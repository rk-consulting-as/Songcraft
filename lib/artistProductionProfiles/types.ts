export type ArtistProductionProfile = {
  label: string
  genres: string[]
  traits: string[]
  vocalStyle?: string
  instrumentation?: string
  source: 'preset' | 'generated'
}
