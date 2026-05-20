import type { AiConfidence } from '@/lib/playlistCommunities/activityTypes'

export type SuggestionStatus = 'pending' | 'approved' | 'ignored'

export type MatchedTrackRow = {
  artist: string
  track: string
  playedAt: string
  playlistPosition: number
  method?: string
}

export type ActivitySuggestion = {
  id: string
  user_id: string
  campaign_id: string
  member_id: string | null
  session_id: string
  confidence: AiConfidence
  summary: string
  matched_tracks: MatchedTrackRow[]
  playlist_coverage_percent: number
  session_start_at: string | null
  session_end_at: string | null
  activity_date: string
  from_date: string
  to_date: string
  status: SuggestionStatus
  created_at: string
  campaignTitle?: string
  playlistTitle?: string
  playlistImageUrl?: string | null
}

export type ParticipationStreaks = {
  dailyCurrent: number
  dailyBest: number
  weeklyCurrent: number
  weeklyBest: number
  lastParticipationDate: string | null
}

export type PassiveParticipationDigest = {
  weekStart: string
  weekEnd: string
  sessionsDetected: number
  proofsApproved: number
  campaignsParticipated: number
  suggestionsApproved: number
  suggestionsIgnored: number
  reputationNote: string
}

export type ParticipationWidgetStats = {
  streaks: ParticipationStreaks
  weekCompletionPercent: number
  weekApprovedCount: number
  pendingSuggestions: number
  pendingOwnerReviews: number
  avgCampaignCompletionPercent: number
  activeCampaignCount: number
}

export type CampaignHealthScore = {
  score: number
  labelKey: string
  factors: {
    activeMembers: number
    proofConsistency: number
    confidenceQuality: number
    missedActivity: number
    participationFrequency: number
  }
}
