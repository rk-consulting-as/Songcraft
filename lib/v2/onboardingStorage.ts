const COMMUNITY_INTRO_SEEN_KEY = 'viatone_v2_community_intro_seen'

export function isCommunityIntroSeen(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(COMMUNITY_INTRO_SEEN_KEY) === '1'
}

export function markCommunityIntroSeen(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMMUNITY_INTRO_SEEN_KEY, '1')
}
