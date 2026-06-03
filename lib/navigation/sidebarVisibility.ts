import { isSidebarNavEnabled, getSidebarNavEnvFlagValue, getSidebarNavLocalStorageOverride } from '@/lib/navigation/featureFlags'
import { isSidebarNavExcluded } from '@/lib/navigation/routes'

export const SIDEBAR_DESKTOP_MQ = '(min-width: 761px)'

export type SidebarVisibilityState = {
  envFlag: string
  localStorageOverride: string | null
  isDesktop: boolean
  isExcludedRoute: boolean
  isAuthenticated: boolean
  enabled: boolean
  sidebarActive: boolean
}

export function computeSidebarVisibility(input: {
  pathname: string | null
  isDesktop: boolean
  isAuthenticated: boolean
  enabled?: boolean
}): SidebarVisibilityState {
  const enabled = input.enabled ?? isSidebarNavEnabled()
  const isExcludedRoute = isSidebarNavExcluded(input.pathname)
  const sidebarActive = enabled && input.isAuthenticated && input.isDesktop && !isExcludedRoute

  return {
    envFlag: getSidebarNavEnvFlagValue(),
    localStorageOverride: typeof window !== 'undefined' ? getSidebarNavLocalStorageOverride() : null,
    isDesktop: input.isDesktop,
    isExcludedRoute,
    isAuthenticated: input.isAuthenticated,
    enabled,
    sidebarActive,
  }
}

export function readIsDesktop(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(SIDEBAR_DESKTOP_MQ).matches
}
