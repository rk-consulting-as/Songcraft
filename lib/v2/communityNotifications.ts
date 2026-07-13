import type {
  V2CommunityNotificationKind,
  V2NotificationInput,
  V2NotificationTone,
} from '@/lib/v2/types'

/**
 * Centralized config + builders for ViaTone community notifications.
 * Copy is English-only, warm and useful. No "verified streams" language.
 */

type NotificationConfig = {
  icon: string
  tone: V2NotificationTone
  defaultCtaLabel: string
  fallbackTitle: string
}

export const V2_NOTIFICATION_CONFIG: Record<V2CommunityNotificationKind, NotificationConfig> = {
  session_submission_approved: {
    icon: '✓',
    tone: 'positive',
    defaultCtaLabel: 'View session',
    fallbackTitle: 'Your song was approved for a session.',
  },
  session_submission_removed: {
    icon: '↩',
    tone: 'info',
    defaultCtaLabel: 'View session',
    fallbackTitle: 'A song submission was not added to the session.',
  },
  session_started: {
    icon: '●',
    tone: 'attention',
    defaultCtaLabel: 'Join now',
    fallbackTitle: 'A session you joined is now live.',
  },
  session_completed: {
    icon: '◎',
    tone: 'info',
    defaultCtaLabel: 'View recap',
    fallbackTitle: 'A session you joined has wrapped up.',
  },
  song_received_feedback: {
    icon: '💬',
    tone: 'positive',
    defaultCtaLabel: 'Read feedback',
    fallbackTitle: 'You received new feedback on your song.',
  },
  song_feedback_reaction: {
    icon: '♥',
    tone: 'positive',
    defaultCtaLabel: 'View song',
    fallbackTitle: 'Someone reacted to your feedback.',
  },
  supporter_badge_earned: {
    icon: '★',
    tone: 'celebrate',
    defaultCtaLabel: 'View profile',
    fallbackTitle: 'You earned a new supporter badge.',
  },
  top_supporter_this_week: {
    icon: '🏅',
    tone: 'celebrate',
    defaultCtaLabel: 'View profile',
    fallbackTitle: 'You were a top supporter this week.',
  },
  playlist_room_round_completed: {
    icon: '♫',
    tone: 'info',
    defaultCtaLabel: 'Open room',
    fallbackTitle: 'A playlist room you joined completed a listening round.',
  },
  playlist_room_submission_added: {
    icon: '♪',
    tone: 'positive',
    defaultCtaLabel: 'Open room',
    fallbackTitle: 'Your song was added to a playlist room.',
  },
  feedback_needed: {
    icon: '💬',
    tone: 'attention',
    defaultCtaLabel: 'Give feedback',
    fallbackTitle: 'A song in one of your circles is waiting for feedback.',
  },
  session_needs_participation: {
    icon: '👂',
    tone: 'attention',
    defaultCtaLabel: 'Confirm listening',
    fallbackTitle: 'A session you joined is waiting for your participation.',
  },
  host_submission_pending: {
    icon: '⧗',
    tone: 'attention',
    defaultCtaLabel: 'Review submissions',
    fallbackTitle: 'You have song submissions waiting for review.',
  },
  room_activity_waiting: {
    icon: '♫',
    tone: 'info',
    defaultCtaLabel: 'Open room',
    fallbackTitle: 'A playlist room you joined had recent activity.',
  },
  followed_circle_session_scheduled: {
    icon: '📅',
    tone: 'info',
    defaultCtaLabel: 'View session',
    fallbackTitle: 'A circle you follow scheduled a new session.',
  },
  followed_host_session_live: {
    icon: '●',
    tone: 'attention',
    defaultCtaLabel: 'Join now',
    fallbackTitle: 'A host you follow is live.',
  },
  saved_session_starting_soon: {
    icon: '◷',
    tone: 'attention',
    defaultCtaLabel: 'Open session',
    fallbackTitle: 'A saved session is starting soon.',
  },
  saved_playlist_round_completed: {
    icon: '♫',
    tone: 'info',
    defaultCtaLabel: 'Open room',
    fallbackTitle: 'A saved playlist room completed a round.',
  },
  curator_submission_shortlisted: {
    icon: '★',
    tone: 'positive',
    defaultCtaLabel: 'View room',
    fallbackTitle: 'Your song was shortlisted in a Curator Room.',
  },
  curator_submission_accepted: {
    icon: '✓',
    tone: 'positive',
    defaultCtaLabel: 'View room',
    fallbackTitle: 'Your song was accepted by a curator.',
  },
  curator_submission_rejected: {
    icon: '↩',
    tone: 'info',
    defaultCtaLabel: 'View room',
    fallbackTitle: 'A curator reviewed your submission.',
  },
  curator_song_added_to_playlist: {
    icon: '♫',
    tone: 'celebrate',
    defaultCtaLabel: 'View room',
    fallbackTitle: 'Your song was marked for playlist placement.',
  },
  curator_session_scheduled: {
    icon: '📅',
    tone: 'info',
    defaultCtaLabel: 'View session',
    fallbackTitle: 'A Curator Room scheduled a listening session.',
  },
  curator_feedback_received: {
    icon: '💬',
    tone: 'positive',
    defaultCtaLabel: 'View song',
    fallbackTitle: 'New feedback on your Curator Room submission.',
  },
}

export function notificationIcon(kind: string): string {
  return V2_NOTIFICATION_CONFIG[kind as V2CommunityNotificationKind]?.icon ?? '•'
}

export function notificationTone(kind: string): V2NotificationTone {
  return V2_NOTIFICATION_CONFIG[kind as V2CommunityNotificationKind]?.tone ?? 'info'
}

// ---------------------------------------------------------------------------
// Builders — return V2NotificationInput ready for the data layer.
// ---------------------------------------------------------------------------

export function buildSessionSubmissionApproved(params: {
  userId: string
  sessionId: string
  sessionTitle: string
  songTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'session_submission_approved',
    title: `Your song was approved for “${params.sessionTitle}”.`,
    body: `“${params.songTitle}” is in the queue.`,
    ctaLabel: 'View session',
    ctaHref: `/community/sessions/${params.sessionId}`,
    entityType: 'session',
    entityId: params.sessionId,
    metadata: { songTitle: params.songTitle },
  }
}

export function buildSessionSubmissionRemoved(params: {
  userId: string
  sessionId: string
  sessionTitle: string
  songTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'session_submission_removed',
    title: `“${params.songTitle}” wasn’t added to “${params.sessionTitle}”.`,
    body: 'You can submit it to another session or circle anytime.',
    ctaLabel: 'View session',
    ctaHref: `/community/sessions/${params.sessionId}`,
    entityType: 'session',
    entityId: params.sessionId,
    metadata: { songTitle: params.songTitle },
  }
}

export function buildSessionStarted(params: {
  userId: string
  sessionId: string
  sessionTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'session_started',
    title: `“${params.sessionTitle}” is now live.`,
    body: 'Join the room and listen along.',
    ctaLabel: 'Join now',
    ctaHref: `/community/sessions/${params.sessionId}`,
    entityType: 'session',
    entityId: params.sessionId,
  }
}

export function buildSessionCompleted(params: {
  userId: string
  sessionId: string
  sessionTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'session_completed',
    title: `“${params.sessionTitle}” has wrapped up.`,
    body: 'See the recap — songs played, participants and feedback.',
    ctaLabel: 'View recap',
    ctaHref: `/community/sessions/${params.sessionId}`,
    entityType: 'session',
    entityId: params.sessionId,
  }
}

export function buildSongReceivedFeedback(params: {
  userId: string
  songId: string
  songTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'song_received_feedback',
    title: `You received new feedback on “${params.songTitle}”.`,
    body: 'A community member shared notes on your track.',
    ctaLabel: 'Read feedback',
    ctaHref: `/community/songs/${params.songId}`,
    entityType: 'song',
    entityId: params.songId,
    metadata: { songTitle: params.songTitle },
  }
}

export function buildSupporterBadgeEarned(params: {
  userId: string
  badgeId: string
  badgeLabel: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'supporter_badge_earned',
    title: `You earned the “${params.badgeLabel}” badge.`,
    body: 'Your community participation is paying off.',
    ctaLabel: 'View profile',
    ctaHref: '/community/participation',
    entityType: 'badge',
    entityId: params.badgeId,
    metadata: { badgeId: params.badgeId, badgeLabel: params.badgeLabel },
  }
}

export function buildPlaylistRoomRoundCompleted(params: {
  userId: string
  roomSlug: string
  roomName: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'playlist_room_round_completed',
    title: `“${params.roomName}” just completed a listening round.`,
    body: 'See what got played and who showed up.',
    ctaLabel: 'Open room',
    ctaHref: `/community/playlists/${params.roomSlug}`,
    entityType: 'playlist_room',
    entityId: params.roomSlug,
  }
}

export function buildPlaylistRoomSubmissionAdded(params: {
  userId: string
  roomSlug: string
  roomName: string
  songTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'playlist_room_submission_added',
    title: `“${params.songTitle}” was added to “${params.roomName}”.`,
    body: 'It’s part of the room’s listening rounds now.',
    ctaLabel: 'Open room',
    ctaHref: `/community/playlists/${params.roomSlug}`,
    entityType: 'playlist_room',
    entityId: params.roomSlug,
    metadata: { songTitle: params.songTitle },
  }
}

export function buildFollowedCircleSessionScheduled(params: {
  userId: string
  circleName: string
  sessionId: string
  sessionTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'followed_circle_session_scheduled',
    title: `“${params.circleName}” scheduled “${params.sessionTitle}”.`,
    body: 'A circle you follow has a new listening event.',
    ctaLabel: 'View session',
    ctaHref: `/community/sessions/${params.sessionId}`,
    entityType: 'session',
    entityId: params.sessionId,
  }
}

export function buildFollowedHostSessionLive(params: {
  userId: string
  sessionId: string
  sessionTitle: string
  hostName: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'followed_host_session_live',
    title: `“${params.sessionTitle}” is live now.`,
    body: `${params.hostName} started a listening session.`,
    ctaLabel: 'Join now',
    ctaHref: `/community/sessions/${params.sessionId}`,
    entityType: 'session',
    entityId: params.sessionId,
  }
}

export function buildSavedSessionStartingSoon(params: {
  userId: string
  sessionId: string
  sessionTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'saved_session_starting_soon',
    title: `Your saved session “${params.sessionTitle}” starts soon.`,
    body: 'Get ready to listen along.',
    ctaLabel: 'Open session',
    ctaHref: `/community/sessions/${params.sessionId}`,
    entityType: 'session',
    entityId: params.sessionId,
  }
}

export function buildSavedPlaylistRoundCompleted(params: {
  userId: string
  roomSlug: string
  roomName: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'saved_playlist_round_completed',
    title: `“${params.roomName}” completed a listening round.`,
    body: 'A Curator Room you saved had new activity.',
    ctaLabel: 'Open room',
    ctaHref: `/community/playlists/${params.roomSlug}`,
    entityType: 'playlist_room',
    entityId: params.roomSlug,
  }
}

export function buildCuratorSubmissionShortlisted(params: {
  userId: string
  roomSlug: string
  roomName: string
  songTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'curator_submission_shortlisted',
    title: `“${params.songTitle}” was shortlisted in “${params.roomName}”.`,
    body: 'The curator is still reviewing — you will hear more soon.',
    ctaLabel: 'View room',
    ctaHref: `/community/playlists/${params.roomSlug}`,
    entityType: 'playlist_room',
    entityId: params.roomSlug,
    metadata: { songTitle: params.songTitle },
  }
}

export function buildCuratorSubmissionAccepted(params: {
  userId: string
  roomSlug: string
  roomName: string
  songTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'curator_submission_accepted',
    title: `“${params.songTitle}” was accepted in “${params.roomName}”.`,
    body: 'Great fit for this Curator Room — watch for session and playlist updates.',
    ctaLabel: 'View room',
    ctaHref: `/community/playlists/${params.roomSlug}`,
    entityType: 'playlist_room',
    entityId: params.roomSlug,
    metadata: { songTitle: params.songTitle },
  }
}

export function buildCuratorSubmissionRejected(params: {
  userId: string
  roomSlug: string
  roomName: string
  songTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'curator_submission_rejected',
    title: `“${params.songTitle}” was not selected for “${params.roomName}”.`,
    body: 'You can submit another song or try a different Curator Room.',
    ctaLabel: 'View room',
    ctaHref: `/community/playlists/${params.roomSlug}`,
    entityType: 'playlist_room',
    entityId: params.roomSlug,
    metadata: { songTitle: params.songTitle },
  }
}

export function buildCuratorSongAddedToPlaylist(params: {
  userId: string
  roomSlug: string
  roomName: string
  songTitle: string
}): V2NotificationInput {
  return {
    userId: params.userId,
    kind: 'curator_song_added_to_playlist',
    title: `“${params.songTitle}” marked for playlist placement.`,
    body: `Curator marked your song in “${params.roomName}”. Update the external playlist when ready.`,
    ctaLabel: 'View room',
    ctaHref: `/community/playlists/${params.roomSlug}`,
    entityType: 'playlist_room',
    entityId: params.roomSlug,
    metadata: { songTitle: params.songTitle },
  }
}
