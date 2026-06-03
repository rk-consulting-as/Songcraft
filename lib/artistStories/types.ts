export const STORY_TYPES = [
  'behind_the_song',
  'release_story',
  'artist_journal',
  'lyrics_meaning',
  'campaign_update',
  'playlist_feature',
  'news',
] as const

export type StoryType = typeof STORY_TYPES[number]

export const STORY_STATUSES = ['draft', 'published', 'archived', 'scheduled'] as const
export type StoryStatus = typeof STORY_STATUSES[number]

export type ArtistStory = {
  id: string
  user_id: string
  artist_id: string
  song_id: string | null
  title: string
  slug: string
  excerpt: string | null
  body: string | null
  story_type: StoryType
  cover_image_url: string | null
  cover_asset_id: string | null
  status: StoryStatus
  seo_title: string | null
  seo_description: string | null
  og_image_url: string | null
  public_hidden: boolean
  admin_hidden: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export type ArtistStoryInsert = Partial<Omit<ArtistStory, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  artist_id: string
  title: string
  slug: string
}

export type GeneratedStoryDraft = {
  title: string
  excerpt: string
  body: string
  seo_title: string
  seo_description: string
  story_type: StoryType
  slug: string
}
