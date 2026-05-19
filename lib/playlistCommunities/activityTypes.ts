export type ActivityLogStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'missed'

export type ProofType = 'image' | 'csv' | 'text' | 'manual'

export type AiConfidence = 'high' | 'medium' | 'low' | 'unclear'

export type CampaignActivityLog = {
  id: string
  campaign_id: string
  member_id: string
  user_id: string
  artist_id: string | null
  song_id: string | null
  activity_date: string
  status: ActivityLogStatus
  proof_type: ProofType
  proof_asset_id: string | null
  proof_text: string | null
  owner_note: string | null
  ai_summary: string | null
  ai_confidence: AiConfidence | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  proofAssetUrl?: string | null
}

export type DayCellSymbol = 'completed' | 'pending' | 'missed' | 'attention' | 'empty' | 'week_complete'

export type ParticipationBoardMember = {
  memberId: string
  artistName: string | null
  songTitle: string | null
  songHref: string | null
  days: { date: string; symbol: DayCellSymbol; logId?: string }[]
  totalSubmitted: number
  approvedCount: number
  missedCount: number
  pendingCount: number
  currentStatus: string
  weekComplete: boolean
}

export type ParticipationPayload = {
  logs: CampaignActivityLog[]
  board: ParticipationBoardMember[]
  weekDates: string[]
  myLogs: CampaignActivityLog[]
  myMemberId: string | null
  pendingReviewCount: number
  stats: {
    totalApproved: number
    totalSubmitted: number
    membersNeedingAttention: number
  }
}
