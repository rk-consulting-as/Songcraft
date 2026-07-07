const V2_API_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'Log in to continue.',
  host_only: 'Only the host can manage this session.',
  host_pro_required: 'Host Pro is required to create circles, sessions and playlist rooms.',
  join_circle_first: 'Join this circle before submitting a song.',
  join_first: 'Join this session before confirming listening.',
  session_ended: 'This session has ended.',
  session_not_public: 'This session is not open to the public.',
  circle_not_public: 'This circle is not open for submissions.',
  circle_not_owned: 'You can only link sessions to circles you own.',
  song_not_owned: 'You can only submit songs from your own catalog.',
  song_id_required: 'Select a song to submit.',
  slug_taken: 'That URL slug is already taken — try another name.',
  invalid_payload: 'Something was missing from your request. Try again.',
  invalid_action: 'That action is not available right now.',
  not_found: 'We could not find that community item.',
  request_failed_403: 'You do not have permission to do that.',
  request_failed_401: 'Log in to continue.',
}

export function formatV2ApiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '')
  if (V2_API_ERROR_MESSAGES[raw]) return V2_API_ERROR_MESSAGES[raw]
  if (raw.startsWith('request_failed_')) {
    const code = raw.replace('request_failed_', '')
    if (code === '403') return V2_API_ERROR_MESSAGES.request_failed_403
    if (code === '401') return V2_API_ERROR_MESSAGES.request_failed_401
  }
  if (raw.includes('host_pro')) return V2_API_ERROR_MESSAGES.host_pro_required
  if (raw.includes('host_only')) return V2_API_ERROR_MESSAGES.host_only
  return raw || 'Something went wrong. Please try again.'
}
