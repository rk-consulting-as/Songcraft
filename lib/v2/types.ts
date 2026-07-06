export type CreationType = 'human' | 'ai_assisted' | 'fully_ai' | 'hybrid'

export type PlatformTag = 'spotify' | 'youtube' | 'tidal' | 'apple' | 'soundcloud' | 'mixed'

export type CircleVisibility = 'public' | 'private' | 'invite'

export type V2PlanTier = 'free' | 'pro_artist' | 'host_pro'

export type V2Circle = {
  id: string
  slug: string
  name: string
  description: string
  coverImageUrl: string
  tags: string[]
  creationTypes: CreationType[]
  platforms: PlatformTag[]
  memberCount: number
  sessionCount: number
  visibility: CircleVisibility
  featured?: boolean
  isMember?: boolean
}

export type V2SessionStatus = 'live' | 'upcoming' | 'ended'

export type V2QueueTrack = {
  position: number
  title: string
  artistName: string
  duration: string
  isNowPlaying?: boolean
}

export type V2Session = {
  id: string
  slug?: string
  title: string
  hostName: string
  hostUserId?: string
  circleSlug: string
  circleName: string
  circleId?: string
  status: V2SessionStatus
  startsAt: string
  platform: PlatformTag
  coverImageUrl: string
  trackCount: number
  artistCount: number
  joinedCount: number
  feedbackPending?: number
  seatsOpen?: number
  queue: V2QueueTrack[]
  features: string[]
  creationTypes: CreationType[]
  userJoined?: boolean
  isHost?: boolean
}

export type V2Artist = {
  id: string
  slug: string
  name: string
  bio: string
  genre: string
  coverImageUrl: string
  avatarInitial: string
  creationType: CreationType
  songCount: number
  circleCount: number
  platforms: PlatformTag[]
  legacyArtistId?: string
  publicPageSlug?: string
}

export type V2Song = {
  id: string
  title: string
  artistSlug: string
  artistName: string
  coverImageUrl: string
  creationType: CreationType
  releaseStatus: 'draft' | 'released' | 'needs_links'
  needsFeedback?: boolean
  platforms: Partial<Record<PlatformTag, string>>
  pitch?: string
  legacySongId?: string
}

export type V2PlaylistRoom = {
  id: string
  slug: string
  name: string
  description: string
  coverImageUrl: string
  trackCount: number
  circleSlug?: string
  platform: PlatformTag
  campaignId?: string
}

export type V2Supporter = {
  id: string
  name: string
  score: number
  badge?: string
}

export type V2FeedbackReaction = 'fire' | 'love' | 'idea' | 'clap'

export type V2SongFeedback = {
  id: string
  songId: string
  fromUserId: string
  fromUserName: string
  body?: string
  rating?: number
  reaction?: V2FeedbackReaction
  createdAt: string
  circleId?: string
  sessionId?: string
}

export type V2SubmissionStatus = 'pending' | 'approved' | 'removed'

export type V2SessionSongRow = {
  id: string
  sessionId: string
  songId?: string
  title: string
  artistName: string
  status: V2SubmissionStatus
  position: number
  submittedBy?: string
  isNowPlaying?: boolean
  duration?: string
}

export type V2CommunityPersonalization = {
  userId: string | null
  myCircles: V2Circle[]
  joinedSessions: V2Session[]
  mySubmissions: { id: string; title: string; artistName: string; targetType: 'circle' | 'session' | 'playlist'; targetLabel: string; status: V2SubmissionStatus; createdAt: string }[]
  recommendedCircles: V2Circle[]
  feedbackReceivedCount: number
}

export type V2CommunityStats = {
  membersStreamingNow: number
  sessionsTonight: number
  songsSubmitted: number
  communityListeningHours: number
  feedbackCompletionPercent: number
}

export type V2PricingPlan = {
  id: V2PlanTier
  name: string
  priceLabel: string
  description: string
  features: string[]
  featured?: boolean
  cta: string
}
