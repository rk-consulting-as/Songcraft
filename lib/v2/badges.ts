import type { V2SupporterBadge, V2SupporterBadgeId, V2SupporterScoreSummary } from '@/lib/v2/types'

export const V2_BADGE_LABELS: Record<V2SupporterBadgeId, { label: string; description: string }> = {
  new_supporter: {
    label: 'New Supporter',
    description: 'Joined your first community listening activity.',
  },
  active_listener: {
    label: 'Active Listener',
    description: 'Confirmed listening in multiple sessions.',
  },
  feedback_giver: {
    label: 'Feedback Giver',
    description: 'Shared ratings and notes with creators.',
  },
  trusted_supporter: {
    label: 'Trusted Supporter',
    description: 'Consistent support across listening and feedback.',
  },
  session_regular: {
    label: 'Session Regular',
    description: 'Shows up for community sessions again and again.',
  },
}

const SCORE_WEIGHTS = {
  sessionsJoined: 10,
  sessionsListened: 15,
  feedbackGiven: 20,
  songsSupported: 25,
  playlistRoomParticipation: 12,
  circlesJoined: 5,
} as const

export function computeSupporterScore(
  counts: Omit<V2SupporterScoreSummary, 'score'>,
): number {
  return (
    counts.sessionsJoined * SCORE_WEIGHTS.sessionsJoined
    + counts.sessionsListened * SCORE_WEIGHTS.sessionsListened
    + counts.feedbackGiven * SCORE_WEIGHTS.feedbackGiven
    + counts.songsSupported * SCORE_WEIGHTS.songsSupported
    + counts.playlistRoomParticipation * SCORE_WEIGHTS.playlistRoomParticipation
    + counts.circlesJoined * SCORE_WEIGHTS.circlesJoined
  )
}

export function computeEarnedBadges(summary: V2SupporterScoreSummary): V2SupporterBadge[] {
  const earned: V2SupporterBadgeId[] = []

  const hasAnyParticipation =
    summary.sessionsJoined > 0
    || summary.playlistRoomParticipation > 0
    || summary.songsSupported > 0
    || summary.feedbackGiven > 0

  if (hasAnyParticipation) earned.push('new_supporter')
  if (summary.sessionsListened >= 2) earned.push('active_listener')
  if (summary.feedbackGiven >= 1) earned.push('feedback_giver')
  if (summary.sessionsJoined >= 4) earned.push('session_regular')
  if (
    summary.score >= 180
    || (summary.sessionsListened >= 5 && summary.feedbackGiven >= 3)
    || (summary.songsSupported >= 5 && summary.sessionsListened >= 3)
  ) {
    earned.push('trusted_supporter')
  }

  return earned.map(id => ({
    id,
    label: V2_BADGE_LABELS[id].label,
    description: V2_BADGE_LABELS[id].description,
  }))
}

export function primaryBadgeLabel(badges: V2SupporterBadge[]): string | undefined {
  const priority: V2SupporterBadgeId[] = [
    'trusted_supporter',
    'session_regular',
    'active_listener',
    'feedback_giver',
    'new_supporter',
  ]
  for (const id of priority) {
    const match = badges.find(b => b.id === id)
    if (match) return match.label
  }
  return undefined
}
