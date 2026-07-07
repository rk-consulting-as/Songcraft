const COMMUNITY_ONBOARDING_KEY = 'viatone_v2_community_onboarding_dismissed'
const HOST_ONBOARDING_KEY = 'viatone_v2_host_onboarding_dismissed'

export function isCommunityOnboardingDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(COMMUNITY_ONBOARDING_KEY) === '1'
}

export function dismissCommunityOnboarding(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMMUNITY_ONBOARDING_KEY, '1')
}

export function isHostOnboardingDismissed(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(HOST_ONBOARDING_KEY) === '1'
}

export function dismissHostOnboarding(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(HOST_ONBOARDING_KEY, '1')
}
