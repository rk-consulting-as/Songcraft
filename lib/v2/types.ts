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

/** UI label: ended = completed */
export type V2SessionDisplayStatus = 'upcoming' | 'live' | 'completed'

export type V2SessionPlayLog = {
  id: string
  sessionId: string
  sessionSongId?: string
  songId?: string
  title: string
  artistName: string
  playedByName: string
  playedAt: string
  source: 'manual_host' | 'auto'
  note?: string
}

export type V2SessionParticipant = {
  id: string
  userId: string
  displayName: string
  status: 'joined' | 'reserved' | 'left'
  joinedAt: string
  listenedAt?: string
  note?: string
}

export type V2SessionRecap = {
  sessionId: string
  title: string
  songsPlayed: V2SessionPlayLog[]
  participantCount: number
  listenedCount: number
  feedbackCount: number
  topSupporters: { name: string; count: number }[]
  hostNotes: string[]
  completedAt?: string
}

export type V2PlaylistRoomActivity = {
  recentSubmissions: { id: string; title: string; artistName: string; createdAt: string }[]
  lastPlayed: { id: string; title: string; artistName: string; playedAt: string }[]
  listenedCount: number
  participationCount: number
  roundStatus: 'active' | 'completed'
  lastCompletedAt?: string
  linkedSessions: { id: string; title: string; status: V2SessionStatus }[]
  recentSupporters: V2Supporter[]
  topSupportersThisWeek: V2Supporter[]
}

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
  circleId?: string
  platform: PlatformTag
  campaignId?: string
  ownerUserId?: string
  roundStatus?: 'active' | 'completed'
  lastCompletedAt?: string
}

export type V2SupporterBadgeId =
  | 'new_supporter'
  | 'active_listener'
  | 'feedback_giver'
  | 'trusted_supporter'
  | 'session_regular'

export type V2SupporterBadge = {
  id: V2SupporterBadgeId
  label: string
  description: string
}

export type V2SupporterScoreSummary = {
  score: number
  sessionsJoined: number
  sessionsListened: number
  feedbackGiven: number
  songsSupported: number
  playlistRoomParticipation: number
  circlesJoined: number
}

export type V2ParticipationHistoryItem = {
  id: string
  type: 'session_joined' | 'session_listened' | 'feedback' | 'song_submission' | 'playlist_listened'
  title: string
  subtitle: string
  at: string
  href?: string
}

export type V2SuggestedParticipationAction = {
  label: string
  href: string
  reason: string
}

export type V2HostCapabilities = {
  tier: V2PlanTier
  isAdmin: boolean
  hostProActive: boolean
  softGating: boolean
  isExistingHost: boolean
  canCreateCircle: boolean
  canCreateSession: boolean
  canCreatePlaylistRoom: boolean
  canViewRecaps: boolean
  canViewSupporterReports: boolean
  showUpgradePrompt: boolean
}

export type V2HostPendingSubmission = {
  id: string
  title: string
  artistName: string
  sessionId: string
  sessionTitle: string
  status: V2SubmissionStatus
  createdAt: string
}

export type V2HostRecentParticipation = {
  sessionId: string
  sessionTitle: string
  participantCount: number
  listenedCount: number
  completedAt?: string
}

export type V2HostAnalytics = {
  totalParticipants: number
  songsSubmitted: number
  songsPlayed: number
  feedbackCount: number
  completionRate: number
  topSupporters: V2Supporter[]
}

export type V2HostDashboard = {
  access: V2HostCapabilities
  circles: V2Circle[]
  sessions: V2Session[]
  playlistRooms: V2PlaylistRoom[]
  pendingSubmissions: V2HostPendingSubmission[]
  upcomingSessions: V2Session[]
  recentParticipation: V2HostRecentParticipation[]
  analytics: V2HostAnalytics
}

export type V2CommunityProfileCard = {
  userId: string
  displayName: string
  avatarInitial: string
  scoreSummary: V2SupporterScoreSummary
  badges: V2SupporterBadge[]
  activityEvidenceAvailable: boolean
}

export type V2Supporter = {
  id: string
  name: string
  score: number
  badge?: string
  badges?: V2SupporterBadge[]
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
  submittedByName?: string
  isNowPlaying?: boolean
  duration?: string
  playedAt?: string
}

export type CommunityPersonalization = {
  userId: string | null
  myCircles: V2Circle[]
  joinedSessions: V2Session[]
  mySubmissions: { id: string; title: string; artistName: string; targetType: 'circle' | 'session' | 'playlist'; targetLabel: string; status: V2SubmissionStatus; createdAt: string }[]
  recommendedCircles: V2Circle[]
  feedbackReceivedCount: number
  upcomingSessions: V2Session[]
  liveSessions: V2Session[]
  recentCompletedSessions: V2SessionRecap[]
  recentRoomActivity: { roomSlug: string; roomName: string; lastPlayedTitle?: string; roundStatus: string }[]
  myParticipationSummary: { sessionsJoined: number; sessionsListened: number; playlistSubmissions: number }
  supporterScore: V2SupporterScoreSummary
  badges: V2SupporterBadge[]
  participationHistory: V2ParticipationHistoryItem[]
  suggestedAction: V2SuggestedParticipationAction | null
  activityEvidenceAvailable: boolean
  hostCta: 'dashboard' | 'become_host' | null
  hostAccess: V2HostCapabilities | null
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
