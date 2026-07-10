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
  ownerUserId?: string
  followerCount?: number
}

export type V2SessionStatus = 'live' | 'upcoming' | 'ended'

export type V2RsvpStatus = 'going' | 'interested' | 'declined'

export type V2RecurrenceRule = 'weekly' | 'biweekly' | 'monthly'

export type V2SessionRsvpCounts = {
  going: number
  interested: number
  total: number
}

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
  description?: string
  circleSlug: string
  circleName: string
  circleId?: string
  status: V2SessionStatus
  startsAt: string
  endsAt?: string
  timezone?: string
  isRecurring?: boolean
  recurrenceRule?: V2RecurrenceRule | string
  parentSessionId?: string
  rsvpCount?: number
  rsvpCounts?: V2SessionRsvpCounts
  userRsvpStatus?: V2RsvpStatus | null
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
  catalogSnapshot: { artistCount: number; songCount: number }
  followedActivity?: {
    circleSessions: V2Session[]
    hostSessions: V2Session[]
    followedCircles: V2Circle[]
  }
  savedSessions?: V2Session[]
  savedRooms?: V2PlaylistRoom[]
}

export type V2CommunityNotificationKind =
  | 'session_submission_approved'
  | 'session_submission_removed'
  | 'session_started'
  | 'session_completed'
  | 'song_received_feedback'
  | 'song_feedback_reaction'
  | 'supporter_badge_earned'
  | 'top_supporter_this_week'
  | 'playlist_room_round_completed'
  | 'playlist_room_submission_added'
  | 'feedback_needed'
  | 'session_needs_participation'
  | 'host_submission_pending'
  | 'room_activity_waiting'
  | 'followed_circle_session_scheduled'
  | 'followed_host_session_live'
  | 'saved_session_starting_soon'
  | 'saved_playlist_round_completed'

export type V2SavedEntityType = 'session' | 'playlist_room'

export type V2NotificationTone = 'positive' | 'info' | 'attention' | 'celebrate'

/** Row shape as stored / read from v2_community_notifications. */
export type V2CommunityNotificationRow = {
  id: string
  userId: string
  kind: V2CommunityNotificationKind | string
  title: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  entityType?: string
  entityId?: string
  metadata: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

/** Normalized model for rendering a notification row. */
export type V2CommunityNotificationView = {
  id: string
  kind: V2CommunityNotificationKind | string
  icon: string
  tone: V2NotificationTone
  title: string
  body?: string
  cta?: { label: string; href: string }
  isRead: boolean
  createdAt: string
}

/** Payload used when creating a notification (user_id added by data layer). */
export type V2NotificationInput = {
  userId: string
  kind: V2CommunityNotificationKind
  title: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export type V2CommunityReminderKind =
  | 'feedback_needed'
  | 'session_live_now'
  | 'session_needs_participation'
  | 'submission_pending'
  | 'room_activity'
  | 'session_starts_soon'
  | 'session_rsvp_going'
  | 'host_submission_pending'
  | 'host_session_no_participants'
  | 'host_session_no_rsvps'
  | 'host_session_needs_submissions'
  | 'host_room_new_songs'
  | 'host_session_soon'

export type V2CommunityReminder = {
  id: string
  kind: V2CommunityReminderKind
  icon: string
  tone: V2NotificationTone
  title: string
  body?: string
  cta: { label: string; href: string }
}

export type V2WeeklyDigest = {
  hasActivity: boolean
  sessionsJoined: number
  listeningConfirmations: number
  feedbackGiven: number
  songsSupported: number
  playlistRoomParticipation: number
  badgeEarnedThisWeek?: string
}

export type V2CalendarView = 'upcoming' | 'this_week' | 'my_sessions' | 'hosting'

export type V2CalendarSession = V2Session & {
  hostName: string
  userRsvpStatus?: V2RsvpStatus | null
  isHosting?: boolean
}

export type V2CalendarDayGroup = {
  dateKey: string
  label: string
  sessions: V2CalendarSession[]
}

export type V2PublicHostProfile = {
  id: string
  displayName: string
  avatarUrl?: string
  bio?: string
  isHost: boolean
  hostedCircleCount: number
  completedSessionCount: number
  upcomingSessions: V2Session[]
  hostedCircles: V2Circle[]
  playlistRooms: V2PlaylistRoom[]
}

export type V2PublicExploreFilters = {
  genre?: string
  platform?: string
  status?: 'upcoming' | 'live' | 'ended' | 'all'
  type?: 'all' | 'circle' | 'session' | 'playlist_room'
}

export type V2PublicExploreData = {
  featuredCircles: V2Circle[]
  upcomingSessions: V2Session[]
  liveSessions: V2Session[]
  playlistRooms: V2PlaylistRoom[]
  genres: string[]
  platforms: string[]
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
