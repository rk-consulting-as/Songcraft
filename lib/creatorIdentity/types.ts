export type CreatorLevel = 'beginner' | 'emerging' | 'active' | 'advanced'

export type FeaturedReleaseRef = {
  type: 'song' | 'album'
  id: string
}

export type CreatorPageSettings = {
  featured_release?: FeaturedReleaseRef | null
  /** Manual or editorial: show "Featured on ViaTone" badge in discovery. */
  featured_on_viatone?: boolean
  show_public_achievements?: boolean
  show_member_since?: boolean
  sections?: Record<string, boolean>
  accent_color?: string
  epk?: {
    public_enabled?: boolean
    short_bio?: string
    long_bio?: string
    selected_song_ids?: string[]
  }
}

export type PublicAchievementId =
  | 'first_release'
  | 'hundred_clicks'
  | 'first_fan'
  | 'growth_starter'
  | 'campaign_builder'
  | 'public_launch'
  | 'epk_published'

export type PublicAchievementDef = {
  id: PublicAchievementId
  labelKey: string
  icon: string
  badgeKey?: string
}

export type PublicAchievement = PublicAchievementDef & {
  earned: boolean
  label: string
  badge?: string
}

export type CreatorIdentityStats = {
  publicReleaseCount: number
  publicSongCount: number
  profileCompletionPercent: number
  growthScorePercent: number
  clickCount: number
  subscriberCount: number
  hasEpk: boolean
  hasCampaign: boolean
  hasPublicPage: boolean
}

export type CreatorIdentity = {
  level: CreatorLevel
  levelLabelKey: string
  profileCompletionPercent: number
  publicReleaseCount: number
  growthScorePercent: number
  achievements: PublicAchievement[]
  memberSince?: string | null
}

export type DiscoverCreatorCardData = {
  id: string
  name: string
  slug: string
  genre: string | null
  imageUrl: string | null
  description: string | null
  level: CreatorLevel
  levelLabelKey: string
  profileCompletionPercent: number
  publicReleaseCount: number
  publicSongCount: number
  trendingScore: number
  achievements: PublicAchievement[]
  featuredRelease: {
    type: 'song' | 'album'
    id: string
    title: string
    coverUrl: string | null
    href: string | null
  } | null
  memberSince: string | null
  createdAt: string
  publicCampaignCount: number
  featuredOnViaTone: boolean
}
