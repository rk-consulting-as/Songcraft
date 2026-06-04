import { aiOutputLanguageDirective, type AIOutputLang } from '@/lib/aiOutputLanguage'
import { clientPublicUrl } from '@/lib/appUrl'
import {
  appendCanonicalTitleDirective,
  canonicalTitleUserLine,
  storySongTitleGuidance,
} from '@/lib/songs/canonicalTitle'
import { buildSongListenLinks } from '@/lib/songs/publicListenLinks'
import { slugifyStoryTitle } from './slug'
import { STORY_TYPES, type GeneratedStoryDraft, type StoryType } from './types'

export type SongStorySource = {
  id?: string
  title: string
  lyrics?: string | null
  backstory?: string | null
  genre?: string | null
  mood?: string | null
  artistName?: string | null
  artistDescription?: string | null
  artistSongStructure?: string | null
  sunoPrompt?: string | null
  sunoPromptDetailed?: string | null
  campaignText?: string | null
  songDna?: unknown
  spotify_url?: string | null
  suno_url?: string | null
  media_links?: { platform: string; url: string; label?: string }[] | null
  publicSongUrl?: string | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  public_hidden?: boolean | null
}

export type StoryAssistantInput = SongStorySource & {
  storyType?: StoryType
  direction?: string
  outputLang?: AIOutputLang
}

const QUALITY_RULES = [
  'Do not invent fake biographical facts unless clearly framed as fictional artist lore.',
  'Do not claim real awards, chart placements, reviews, or press coverage unless provided in the source material.',
  'Keep the story authentic to the artist voice and the provided lyrics/backstory.',
  'Use the provided lyrics and backstory as primary source material when available.',
  'Never state the story is already published — this is a draft for the artist to review.',
]

function isStoryType(v: unknown): v is StoryType {
  return typeof v === 'string' && (STORY_TYPES as readonly string[]).includes(v)
}

function formatStreamingLinksForPrompt(input: SongStorySource): string {
  const links = buildSongListenLinks(input)
  if (!links.length) return ''
  return `Available streaming / media links:\n${links.map(l => `${l.platform}: ${l.url}`).join('\n')}`
}

function formatSongDna(dna: unknown): string {
  if (!dna) return ''
  if (typeof dna === 'string') return dna.slice(0, 1200)
  try {
    return JSON.stringify(dna, null, 2).slice(0, 1200)
  } catch {
    return ''
  }
}

export function summarizePublishContent(publishContent: unknown): string {
  if (!publishContent || typeof publishContent !== 'object') return ''
  const pc = publishContent as Record<string, unknown>
  const parts: string[] = []
  const keys = [
    'release_pitch',
    'press_release',
    'campaign_one_liner',
    'facebook_post',
    'instagram_caption',
    'tiktok_caption',
    'youtube_shorts_caption',
    'newsletter_blurb',
  ]
  for (const key of keys) {
    const val = pc[key]
    if (typeof val === 'string' && val.trim()) parts.push(`${key}:\n${val.trim()}`)
  }
  return parts.join('\n\n').slice(0, 2200)
}

export function buildStoryAssistantPrompt(input: StoryAssistantInput): { system: string; user: string } {
  const storyType = input.storyType || 'behind_the_song'
  const typeHint = {
    behind_the_song: 'Behind the Song — inspiration, writing process, and meaning for fans.',
    release_story: 'Release story — anticipation, release moment, and why it matters now.',
    artist_journal: 'Artist journal — personal reflection in the artist voice.',
    lyrics_meaning: 'Lyrics meaning — interpret key lines and themes without over-explaining.',
    campaign_update: 'Campaign update — share progress and invite fans along the journey.',
    playlist_feature: 'Playlist feature — context for a playlist placement or feature.',
    news: 'News-style update — concise, factual tone about this music news.',
  }[storyType]

  const system = appendCanonicalTitleDirective(
    [
      aiOutputLanguageDirective(input.outputLang || 'en'),
      'You are a music storyteller helping an independent artist write a fan-facing blog story.',
      'Write engaging, authentic prose suitable for an artist website.',
      'Return ONLY valid JSON with keys: title, excerpt, body, seo_title, seo_description, story_type.',
      'excerpt: 1-2 sentences, max 220 chars.',
      'body: 3-8 short paragraphs; markdown headings allowed.',
      'seo_title: max 60 chars.',
      'seo_description: max 155 chars.',
      'story_type: one of: behind_the_song, release_story, artist_journal, lyrics_meaning, campaign_update, playlist_feature, news.',
      storySongTitleGuidance(input.title),
      ...QUALITY_RULES,
    ].join('\n'),
    input.title,
  )

  const user = [
    `Story type: ${storyType}`,
    `Angle: ${typeHint}`,
    input.direction?.trim() ? `Creator direction:\n${input.direction.trim()}` : '',
    canonicalTitleUserLine(input.title),
    `Song: ${input.title}`,
    input.artistName ? `Artist: ${input.artistName}` : '',
    input.genre ? `Genre: ${input.genre}` : '',
    input.mood ? `Mood: ${input.mood}` : '',
    input.artistDescription ? `Artist description:\n${input.artistDescription.slice(0, 500)}` : '',
    input.artistSongStructure ? `Artist production profile / DNA:\n${input.artistSongStructure.slice(0, 800)}` : '',
    input.backstory ? `Song backstory:\n${input.backstory.slice(0, 1400)}` : '',
    input.lyrics ? `Lyrics:\n${input.lyrics.slice(0, 2000)}` : '',
    input.sunoPrompt ? `Suno / production prompt:\n${input.sunoPrompt.slice(0, 900)}` : '',
    input.sunoPromptDetailed ? `Detailed production prompt:\n${input.sunoPromptDetailed.slice(0, 900)}` : '',
    input.campaignText ? `Release campaign copy:\n${input.campaignText}` : '',
    formatSongDna(input.songDna) ? `Song DNA:\n${formatSongDna(input.songDna)}` : '',
    input.publicSongUrl ? `Public song page URL: ${input.publicSongUrl}` : '',
    formatStreamingLinksForPrompt(input),
    'If streaming links are provided, you may end the body with a short fan-facing CTA such as "Listen to the song here" only when a public song URL or streaming link exists. Do not invent URLs.',
  ].filter(Boolean).join('\n\n')

  return { system, user }
}

/** @deprecated Use buildStoryAssistantPrompt */
export function buildBehindTheSongPrompt(source: SongStorySource): { system: string; user: string } {
  return buildStoryAssistantPrompt({ ...source, storyType: 'behind_the_song' })
}

export function parseGeneratedStoryJson(
  raw: string,
  fallbackTitle: string,
  fallbackType: StoryType = 'behind_the_song',
): GeneratedStoryDraft | null {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const data = JSON.parse(cleaned)
    const title = String(data.title || fallbackTitle).trim()
    const storyType = isStoryType(data.story_type) ? data.story_type : fallbackType
    return {
      title,
      excerpt: String(data.excerpt || '').trim(),
      body: String(data.body || '').trim(),
      seo_title: String(data.seo_title || title).trim().slice(0, 60),
      seo_description: String(data.seo_description || data.excerpt || '').trim().slice(0, 155),
      story_type: storyType,
      slug: slugifyStoryTitle(title),
    }
  } catch {
    return null
  }
}

export function storySourceFromSongRow(
  song: {
    id: string
    title: string
    lyrics_text?: string | null
    backstory?: string | null
    suno_prompt?: string | null
    suno_prompt_detailed?: string | null
    publish_content?: unknown
    song_dna?: unknown
    spotify_url?: string | null
    suno_url?: string | null
    media_links?: { platform: string; url: string; label?: string }[] | null
    cover_image_url?: string | null
    spotify_cover_url?: string | null
    public_hidden?: boolean | null
  },
  artist?: {
    name?: string
    genre?: string | null
    description?: string | null
    song_structure?: string | null
    page_slug?: string | null
    page_enabled?: boolean
  } | null,
): SongStorySource {
  const publicSongUrl =
    song.id && artist?.page_enabled && artist?.page_slug && !song.public_hidden
      ? clientPublicUrl(`/s/${song.id}`)
      : null
  return {
    id: song.id,
    title: song.title,
    lyrics: song.lyrics_text,
    backstory: song.backstory,
    genre: artist?.genre,
    artistName: artist?.name,
    artistDescription: artist?.description,
    artistSongStructure: artist?.song_structure,
    sunoPrompt: song.suno_prompt,
    sunoPromptDetailed: song.suno_prompt_detailed,
    campaignText: summarizePublishContent(song.publish_content),
    songDna: song.song_dna,
    spotify_url: song.spotify_url,
    suno_url: song.suno_url,
    media_links: song.media_links,
    cover_image_url: song.cover_image_url,
    spotify_cover_url: song.spotify_cover_url,
    public_hidden: song.public_hidden,
    publicSongUrl,
  }
}
