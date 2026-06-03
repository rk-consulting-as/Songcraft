import { slugifyStoryTitle } from './slug'
import type { GeneratedStoryDraft, StoryType } from './types'

export type SongStorySource = {
  title: string
  lyrics?: string | null
  backstory?: string | null
  genre?: string | null
  mood?: string | null
  artistName?: string | null
  artistDescription?: string | null
}

export function buildBehindTheSongPrompt(source: SongStorySource): { system: string; user: string } {
  const system = [
    'You are a music journalist helping an independent artist write a fan-facing story.',
    'Write in engaging, personal prose suitable for an artist blog.',
    'Return ONLY valid JSON with keys: title, excerpt, body, seo_title, seo_description.',
    'excerpt: 1-2 sentences, max 220 chars.',
    'body: 3-6 short paragraphs, markdown allowed (headings ok).',
    'seo_title: max 60 chars.',
    'seo_description: max 155 chars.',
    'Do not include promotional spam or fake quotes.',
  ].join('\n')

  const user = [
    `Song: ${source.title}`,
    source.artistName ? `Artist: ${source.artistName}` : '',
    source.genre ? `Genre: ${source.genre}` : '',
    source.mood ? `Mood: ${source.mood}` : '',
    source.artistDescription ? `Artist bio: ${source.artistDescription.slice(0, 400)}` : '',
    source.backstory ? `Backstory:\n${source.backstory.slice(0, 1200)}` : '',
    source.lyrics ? `Lyrics excerpt:\n${source.lyrics.slice(0, 1500)}` : '',
    'Story angle: Behind the Song — inspiration, process, and meaning for fans.',
  ].filter(Boolean).join('\n\n')

  return { system, user }
}

export function parseGeneratedStoryJson(raw: string, fallbackTitle: string): GeneratedStoryDraft | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const data = JSON.parse(cleaned)
    const title = String(data.title || fallbackTitle).trim()
    return {
      title,
      excerpt: String(data.excerpt || '').trim(),
      body: String(data.body || '').trim(),
      seo_title: String(data.seo_title || title).trim().slice(0, 60),
      seo_description: String(data.seo_description || data.excerpt || '').trim().slice(0, 155),
      story_type: 'behind_the_song' as StoryType,
      slug: slugifyStoryTitle(title),
    }
  } catch {
    return null
  }
}
