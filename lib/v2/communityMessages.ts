import { formatV2ApiError } from '@/lib/v2/apiErrors'

/**
 * Human-readable permission / blocked-state copy for community UI.
 * Server routes return machine codes; `formatV2ApiError` maps them to these strings.
 * Use these constants directly for inline (non-error) permission hints.
 */
export const COMMUNITY_PERMISSION_MESSAGES = {
  hostOnlySession: 'Only the host can manage this session.',
  joinCircleFirst: 'Join this circle before submitting a song.',
  joinSessionFirst: 'Join this session before marking participation.',
  hostProRequired: 'Host Pro is required to create new circles, sessions, or playlist rooms.',
  roomNotAvailable: 'This playlist room is private or not available.',
  needSongFirst: 'You need at least one song before submitting to a session.',
  loginRequired: 'Log in to take part in the community.',
} as const

export { formatV2ApiError }
