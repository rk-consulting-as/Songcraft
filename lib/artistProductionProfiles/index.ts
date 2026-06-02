import type { ArtistProductionProfile } from './types'

type ArtistInput = {
  name?: string | null
  genre?: string | null
  description?: string | null
  song_structure?: string | null
}

type SongInput = {
  title: string
  status?: string | null
  lyrics_instructions?: string | null
}

/** Known artist-name presets (examples from spec). */
const NAME_PRESETS: Record<string, Omit<ArtistProductionProfile, 'source'>> = {
  nordfire: {
    label: 'Nordfire',
    genres: ['Arena Rock', '80s Rock'],
    traits: ['Gang Vocals', 'Big Choruses', 'Anthemic Hooks'],
    vocalStyle: 'Powerful gang vocals, arena-ready',
    instrumentation: 'Dual guitars, driving drums, big room production',
  },
  'hellwater saints': {
    label: 'Hellwater Saints',
    genres: ['Dark Country', 'Southern Gothic', 'Swamp Blues', 'Outlaw Country'],
    traits: ['Cinematic Storytelling', 'Gritty Narrative', 'Atmospheric'],
    vocalStyle: 'Weathered baritone, intimate yet raw',
    instrumentation: 'Acoustic guitar, slide, subtle percussion, ambient textures',
  },
  syntralis: {
    label: 'Syntralis',
    genres: ['Dark Synthwave', 'Electronic'],
    traits: ['Neon Atmospheres', 'Electronic Pulse', 'Retro-futuristic'],
    vocalStyle: 'Processed or ethereal vocals',
    instrumentation: 'Analog synths, arpeggiators, gated drums',
  },
  cravyn: {
    label: 'Cravyn',
    genres: ['Motivational Rap', 'Hip-Hop'],
    traits: ['Aggressive Delivery', 'Personal Growth Themes', 'High energy'],
    vocalStyle: 'Confident, punchy rap delivery',
    instrumentation: 'Hard-hitting drums, modern trap/hip-hop production',
  },
}

function matchPreset(name: string): Omit<ArtistProductionProfile, 'source'> | null {
  const key = name.toLowerCase().trim()
  if (NAME_PRESETS[key]) return NAME_PRESETS[key]
  for (const [presetKey, profile] of Object.entries(NAME_PRESETS)) {
    if (key.includes(presetKey) || presetKey.includes(key)) return profile
  }
  return null
}

function extractTraitsFromText(text: string): string[] {
  const traits: string[] = []
  const lower = text.toLowerCase()
  if (lower.includes('chorus') || lower.includes('hook')) traits.push('Strong choruses')
  if (lower.includes('story') || lower.includes('narrative')) traits.push('Story-driven lyrics')
  if (lower.includes('dark') || lower.includes('gothic')) traits.push('Dark atmosphere')
  if (lower.includes('anthem') || lower.includes('arena')) traits.push('Anthemic hooks')
  if (lower.includes('synth') || lower.includes('electronic')) traits.push('Electronic textures')
  if (lower.includes('country') || lower.includes('outlaw')) traits.push('Roots/country edge')
  return traits.slice(0, 6)
}

/** Build reusable production DNA from artist profile and catalog. */
export function generateArtistProductionProfile(
  artist: ArtistInput,
  songs: SongInput[] = []
): ArtistProductionProfile {
  const preset = artist.name ? matchPreset(artist.name) : null
  if (preset) return { ...preset, source: 'preset' }

  const genres = (artist.genre || '')
    .split(/[,;/|]/)
    .map(g => g.trim())
    .filter(Boolean)

  const released = songs.filter(s => s.status === 'released')
  const sample = (released.length ? released : songs).slice(0, 8)

  const traitSet = new Set<string>()
  if (artist.description) extractTraitsFromText(artist.description).forEach(t => traitSet.add(t))
  if (artist.song_structure) extractTraitsFromText(artist.song_structure).forEach(t => traitSet.add(t))
  for (const s of sample) {
    if (s.lyrics_instructions) extractTraitsFromText(s.lyrics_instructions).forEach(t => traitSet.add(t))
  }

  let vocalStyle: string | undefined
  let instrumentation: string | undefined
  const blob = `${artist.description || ''} ${artist.song_structure || ''}`.toLowerCase()
  if (blob.includes('gang vocal') || blob.includes('choir')) vocalStyle = 'Layered gang vocals'
  else if (blob.includes('rap') || blob.includes('hip-hop')) vocalStyle = 'Rhythmic vocal delivery'
  else if (blob.includes('synth')) instrumentation = 'Synth-led production'
  else if (blob.includes('acoustic') || blob.includes('country')) instrumentation = 'Acoustic-forward arrangement'

  return {
    label: artist.name || 'Artist',
    genres: genres.length ? genres : ['Contemporary'],
    traits: Array.from(traitSet).slice(0, 8),
    vocalStyle,
    instrumentation,
    source: 'generated',
  }
}
