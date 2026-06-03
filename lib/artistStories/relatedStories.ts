export type StoryRelatedCandidate = {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  cover_image_url?: string | null
  story_type: string
  song_id?: string | null
}

export function pickRelatedStories<T extends StoryRelatedCandidate>(
  current: Pick<StoryRelatedCandidate, 'id' | 'story_type' | 'song_id'>,
  candidates: T[],
  limit = 4,
): T[] {
  const pool = candidates.filter(c => c.id !== current.id)
  const sameSong = current.song_id
    ? pool.filter(c => c.song_id === current.song_id)
    : []
  const sameType = pool.filter(
    c => c.story_type === current.story_type && !sameSong.some(s => s.id === c.id),
  )
  const used = new Set([...sameSong, ...sameType].map(s => s.id))
  const rest = pool.filter(c => !used.has(c.id))
  return [...sameSong, ...sameType, ...rest].slice(0, limit)
}
