/**
 * Campaign participation notification placeholders.
 * Activity evidence / community accountability — not stream verification.
 */

export type CampaignParticipationNotificationKind =
  | 'activity_proof_approved'
  | 'activity_proof_rejected'
  | 'activity_proof_review_needed'
  | 'campaign_member_missed_activity'

export type CampaignParticipationNotificationPayload = {
  campaign_id: string
  campaign_title?: string
  activity_date?: string
  owner_note?: string
  member_name?: string
}

const COPY_KEYS: Record<CampaignParticipationNotificationKind, string> = {
  activity_proof_approved: 'notifActivityProofApproved',
  activity_proof_rejected: 'notifActivityProofRejected',
  activity_proof_review_needed: 'notifActivityProofReviewNeeded',
  campaign_member_missed_activity: 'notifCampaignMemberMissed',
}

export function getCampaignParticipationNotificationKey(kind: CampaignParticipationNotificationKind) {
  return COPY_KEYS[kind]
}

/** Placeholder: log in-app notification intent (email prefs TBD). */
export async function queueCampaignParticipationNotification(_args: {
  recipientUserId: string
  kind: CampaignParticipationNotificationKind
  payload: CampaignParticipationNotificationPayload
}): Promise<{ queued: boolean; placeholder: true }> {
  // Future: insert notification_log + optional email via sendNotificationEmail
  return { queued: false, placeholder: true }
}
