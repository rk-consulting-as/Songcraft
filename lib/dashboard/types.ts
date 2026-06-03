import type { Lang } from '@/lib/i18n'
import type { UserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'
import type { PlaybookEngineResult } from '@/lib/playbook/computeEngine'
import type { CreatorStage, PersonalizedHero } from './creatorStage'
import type { DiscoverOpportunity } from './discoverOpportunities'
import type { QuickWinItem } from './quickWins'
import type { SmartInsightCard } from './smartInsights'
import type { TodayAction } from './todayActions'
import type { ArtistHealthLabel } from './artistHealthScore'

export type CommandAction = {
  id: string
  label: string
  href: string
  priority: number
  kind: 'release' | 'playlist' | 'story' | 'playbook' | 'growth' | 'community'
}

export type ArtistStripItem = {
  id: string
  name: string
  genre: string
  avatar_url: string | null
  spotify_image_url: string | null
  growthScore: number
  statusKey: string
  statusLabel: string
  song_count: number
  page_enabled?: boolean
  healthScore?: number
  healthLabel?: ArtistHealthLabel
  healthLabelText?: string
}

export type ActiveReleaseItem = {
  id: string
  title: string
  artist_id: string
  artist_name: string
  cover_url: string | null
  completion: number
  status: string
  href: string
}

export type GrowthOpportunityItem = {
  id: string
  title: string
  description: string
  href: string
  impact: 'low' | 'medium' | 'high'
}

export type CommunityMomentum = {
  dailyStreak: number
  weeklyStreak: number
  proofStreak: number
  participationStreak: number
}

export type DashboardInsightsData = {
  artistCount: number
  songCount: number
  projectCount: number
  topArtist: { id: string; name: string; avatar_url: string | null } | null
  topSong: { id: string; title: string; cover_url: string | null; plays: number } | null
  newestSubscriber: { email: string; created_at: string } | null
  newestStory: { id: string; title: string; slug: string; artist_id: string } | null
}

export type CommandCenterSnapshot = {
  actions: CommandAction[] | TodayAction[]
  allActions?: CommandAction[]
  actionCount: number
  releasesInProgress: number
  communityItems: number
  growthScore: number
  artists: ArtistStripItem[]
  activeReleases: ActiveReleaseItem[]
  participation: UserParticipationSummary | null
  pendingProofCount: number
  pendingReviewCount: number
  membersAwaitingApproval: number
  activeCampaignCount: number
  growthOpportunities: GrowthOpportunityItem[]
  insights: DashboardInsightsData
  playbook: PlaybookEngineResult | null
  /** Phase 53B adaptive */
  stage?: CreatorStage
  hero?: PersonalizedHero
  todayActions?: TodayAction[]
  quickWins?: QuickWinItem[]
  smartInsights?: SmartInsightCard[]
  discoverOpportunities?: DiscoverOpportunity[]
  communityMomentum?: CommunityMomentum
}

export type DashboardSongRow = {
  id: string
  title: string
  status: string
  artist_id: string
  lyrics_text?: string | null
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  canvas_prompt?: string | null
  canvas_video_url?: string | null
  spotify_url?: string | null
  media_links?: unknown
  publish_content?: Record<string, unknown> | null
  suno_audio_url?: string | null
  internal_play_count?: number | null
  artists?: { name?: string; page_enabled?: boolean; page_slug?: string | null; page_settings?: Record<string, unknown> } | null
}

export type DashboardArtistRow = {
  id: string
  name: string
  genre: string
  avatar_url: string | null
  spotify_image_url?: string | null
  page_enabled?: boolean
  page_slug?: string | null
  page_settings?: Record<string, unknown> | null
  spotify_url?: string | null
  song_count?: number
}

export type BuildCommandCenterInput = {
  lang: Lang
  artists: DashboardArtistRow[]
  songs: DashboardSongRow[]
  participation: UserParticipationSummary | null
  playbook: PlaybookEngineResult | null
  releaseTasks: { song_id: string; title: string; song_title: string; due_date: string; status: string }[]
  storyDrafts: { id: string; title: string; slug: string; artist_id: string; status: string }[]
  pendingMemberCount: number
  campaignTitles: { id: string; title: string; artist_id?: string }[]
  insights: DashboardInsightsData
  tx: Record<string, string>
}
