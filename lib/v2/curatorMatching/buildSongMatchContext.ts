import { normalizeSongDNA } from '@/lib/songDNA/types'
import type { CuratorSongMatchContext } from './curatorMatchTypes'

export function buildSongMatchContext(input: {
  title: string
  artistName: string
  pitch?: string | null
  songDna?: unknown
  creationType?: string | null
  lyricsInstructions?: string | null
  publishContent?: unknown
}): CuratorSongMatchContext {
  const genres: string[] = []
  const publish = input.publishContent as { genre?: string; tags?: string[] } | null | undefined
  if (publish?.genre) genres.push(publish.genre)
  if (Array.isArray(publish?.tags)) genres.push(...publish.tags.map(String))

  return {
    title: input.title,
    artistName: input.artistName,
    pitch: input.pitch || undefined,
    genres: genres.length ? genres : undefined,
    songDna: normalizeSongDNA(input.songDna as Record<string, number> | null),
    creationType: input.creationType || undefined,
    lyricalThemes: input.lyricsInstructions ? [input.lyricsInstructions.slice(0, 200)] : undefined,
    productionNotes: input.pitch || undefined,
  }
}
