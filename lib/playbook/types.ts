export type PlaybookCategoryId = 'profile' | 'public' | 'music' | 'promotion' | 'growth'

export type PlaybookTag = 'growth' | 'release'

export type PlaybookArtist = {
  id: string
  name: string
  genre?: string | null
  description?: string | null
  avatar_url?: string | null
  spotify_image_url?: string | null
  social_links?: Record<string, { url?: string } | null> | null
  page_enabled?: boolean | null
  page_slug?: string | null
  page_settings?: {
    epk?: {
      short_bio?: string
      long_bio?: string
      public_enabled?: boolean
      selected_song_ids?: string[]
    }
    fan_hub?: unknown
  } | null
}

export type PlaybookSong = {
  id: string
  artist_id: string
  title: string
  status?: string | null
  lyrics_text?: string | null
  lyrics_instructions?: string | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  spotify_url?: string | null
  media_links?: { platform?: string; url?: string }[] | null
  publish_content?: Record<string, unknown> | null
  album_id?: string | null
  spotify_release_date?: string | null
  public_hidden?: boolean | null
}

export type PlaybookContext = {
  userId: string
  artists: PlaybookArtist[]
  songs: PlaybookSong[]
  albumCount: number
  subscriberCount: number
  qrClickCount: number
  embedViewCount: number
  linkClickCount: number
  selectedArtistId?: string | null
  planId?: 'free' | 'pro'
  creatorPlaylistCount: number
  playlistCampaignCount: number
  joinedPlaylistCampaignCount: number
  hasPlaylistSpotifyUrl: boolean
  activityProofSubmitCount: number
  approvedActivityProofCount: number
  hasCompletedCampaignWeek: boolean
  hostedActiveCampaignCount: number
}

export type PlaybookTaskDef = {
  id: string
  category: PlaybookCategoryId
  checkId: string
  weight: number
  priority: number
  labelKey: string
  descKey?: string
  tags?: PlaybookTag[]
  href?: (ctx: PlaybookContext) => string | null
}

export type PlaybookMilestoneDef = {
  id: string
  checkId: string
  labelKey: string
  icon: string
}

export type PlaybookTaskResult = Omit<PlaybookTaskDef, 'href'> & {
  done: boolean
  href: string | null
  label: string
  description?: string
}

export type PlaybookCategoryResult = {
  id: PlaybookCategoryId
  label: string
  percent: number
  doneCount: number
  totalCount: number
  tasks: PlaybookTaskResult[]
}

export type PlaybookMilestoneResult = PlaybookMilestoneDef & {
  done: boolean
  label: string
}

export type PlaybookProgress = {
  overallPercent: number
  categories: PlaybookCategoryResult[]
  milestones: PlaybookMilestoneResult[]
  nextTask: PlaybookTaskResult | null
  growthTask: PlaybookTaskResult | null
  releaseTask: PlaybookTaskResult | null
  contextualPrompt: string | null
  primaryArtist: PlaybookArtist | null
  essentialSetupComplete: boolean
}
