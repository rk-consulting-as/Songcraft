/** Platform-independent playback evidence types — Phase 6A foundation */

export type PlaybackPlatform =
  | 'spotify'
  | 'youtube'
  | 'apple'
  | 'tidal'
  | 'deezer'
  | 'soundcloud'
  | 'amazon'
  | 'viatone'
  | 'mixed'

export type PlaybackProviderId =
  | 'spotify'
  | 'youtube'
  | 'lastfm'
  | 'viatone'
  | 'manual'
  | 'apple'
  | 'tidal'
  | 'deezer'
  | 'soundcloud'
  | 'amazon'

export type PlaybackConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type PlaybackSessionStatus = 'started' | 'collecting' | 'completed' | 'cancelled'

export type PlaybackQueueStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export type PlaybackContextType =
  | 'v2_session'
  | 'v2_playlist_room'
  | 'queue'
  | 'song_page'
  | 'standalone'

export type SnapshotContextType =
  | 'v2_playlist_room'
  | 'v2_session'
  | 'creator_playlist'
  | 'standalone'

export type PlaybackEvidenceType =
  | 'recently_played'
  | 'scrobble'
  | 'watch_history'
  | 'stream_engine'
  | 'manual_confirm'
  | 'participation_confirm'
  | 'playlist_snapshot_match'

export type PlaylistSnapshotTrack = {
  position: number
  externalTrackId?: string
  title: string
  artistName: string
  durationSeconds?: number
  album?: string
  isrc?: string
}

export type PlaylistSnapshot = {
  id: string
  platform: PlaybackPlatform
  externalPlaylistId?: string
  name: string
  description?: string
  coverImageUrl?: string
  ownerUserId?: string
  ownerDisplayName?: string
  trackCount: number
  totalDurationSeconds: number
  tracks: PlaylistSnapshotTrack[]
  linkedContextType?: SnapshotContextType
  linkedContextId?: string
  snapshotAt: string
  createdAt: string
}

export type PlaybackSession = {
  id: string
  userId: string
  playlistSnapshotId?: string
  queueId?: string
  contextType?: PlaybackContextType
  contextId?: string
  platform: PlaybackPlatform
  status: PlaybackSessionStatus
  startedAt: string
  endedAt?: string
  expectedTrackCount: number
  matchedTrackCount: number
  completionRate: number
  confidence: PlaybackConfidence
  metadata?: Record<string, unknown>
}

export type PlaybackEvidence = {
  id: string
  sessionId: string
  trackPosition?: number
  trackExternalId?: string
  trackTitle?: string
  trackArtist?: string
  provider: PlaybackProviderId
  evidenceType: PlaybackEvidenceType
  confidence: PlaybackConfidence
  confidenceScore: number
  observedAt: string
  metadata?: Record<string, unknown>
}

export type PlaybackReport = {
  id: string
  sessionId?: string
  queueId?: string
  playlistSnapshotId?: string
  contextType?: PlaybackContextType
  contextId?: string
  title: string
  participantCount: number
  playbackSessionCount: number
  highConfidenceCount: number
  mediumConfidenceCount: number
  lowConfidenceCount: number
  songsCompleted: number
  averageCompletionRate: number
  feedbackCount: number
  commentCount: number
  topSupporterUserId?: string
  topSupporterName?: string
  topSongTitle?: string
  topSongArtist?: string
  topArtistName?: string
  summary?: Record<string, unknown>
  generatedAt: string
}

export type PlaybackQueue = {
  id: string
  userId: string
  name: string
  status: PlaybackQueueStatus
  estimatedDurationSeconds: number
  estimatedTrackCount: number
  items: { snapshotId: string; snapshotName: string; position: number; trackCount: number }[]
  createdAt: string
  startedAt?: string
  completedAt?: string
}

/** Input for creating an immutable snapshot */
export type CreateSnapshotInput = {
  platform: PlaybackPlatform
  externalPlaylistId?: string
  name: string
  description?: string
  coverImageUrl?: string
  ownerUserId?: string
  ownerDisplayName?: string
  tracks: PlaylistSnapshotTrack[]
  linkedContextType?: SnapshotContextType
  linkedContextId?: string
}

/** Input for starting a playback session */
export type StartPlaybackSessionInput = {
  userId: string
  platform: PlaybackPlatform
  playlistSnapshotId?: string
  queueId?: string
  contextType?: PlaybackContextType
  contextId?: string
  expectedTrackCount?: number
  metadata?: Record<string, unknown>
}

/** Raw evidence before persistence */
export type PlaybackEvidenceInput = {
  trackPosition?: number
  trackExternalId?: string
  trackTitle?: string
  trackArtist?: string
  provider: PlaybackProviderId
  evidenceType: PlaybackEvidenceType
  confidence?: PlaybackConfidence
  confidenceScore?: number
  observedAt?: string
  metadata?: Record<string, unknown>
}

export type MatchedTrack = {
  snapshotPosition: number
  snapshotTitle: string
  snapshotArtist: string
  matchedTitle?: string
  matchedArtist?: string
  matchScore: number
  provider: PlaybackProviderId
}

export type PlaybackProviderContext = {
  userId: string
  sessionId: string
  platform: PlaybackPlatform
  snapshot?: PlaylistSnapshot
  contextType?: PlaybackContextType
  contextId?: string
  startedAt: string
  endedAt?: string
}

/** Safe public labels — never "verified streams" */
export const PLAYBACK_LABELS = {
  evidence: 'Playback Evidence',
  activity: 'Listening Activity',
  participation: 'Community Listening',
  sessionParticipation: 'Session Participation',
  playlistParticipation: 'Playlist Participation',
  confidence: {
    high: 'High confidence',
    medium: 'Medium confidence',
    low: 'Low confidence',
    unknown: 'Unknown',
  },
} as const
