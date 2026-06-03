export const SIDEBAR_NAV_KEY = 'viatone_sidebar_nav_v1'
export const SIDEBAR_NAV_CHANGED_EVENT = 'viatone:sidebar-nav-changed'
const SIDEBAR_COLLAPSED_KEY = 'viatone_sidebar_nav_collapsed'

/** Env default for sidebar nav (NEXT_PUBLIC_SIDEBAR_NAV_V1=1). */
export function getSidebarNavEnvDefault(): boolean {
  return process.env.NEXT_PUBLIC_SIDEBAR_NAV_V1 === '1'
}

export function getSidebarNavEnvFlagValue(): string {
  return process.env.NEXT_PUBLIC_SIDEBAR_NAV_V1 ?? '(unset)'
}

export function getSidebarNavLocalStorageOverride(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(SIDEBAR_NAV_KEY)
}

/** Global desktop sidebar rollout — localStorage "1" always wins over env. */
export function isSidebarNavEnabled(): boolean {
  if (typeof window === 'undefined') {
    return getSidebarNavEnvDefault()
  }
  const stored = localStorage.getItem(SIDEBAR_NAV_KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return getSidebarNavEnvDefault()
}

export function notifySidebarNavChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SIDEBAR_NAV_CHANGED_EVENT))
}

export function setSidebarNavEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIDEBAR_NAV_KEY, enabled ? '1' : '0')
  notifySidebarNavChanged()
}

/** Apply ?sidebar=1|0 query param; returns whether sidebar should be enabled. */
export function applySidebarNavQueryParam(value: string | null): boolean | null {
  if (value !== '1' && value !== '0') return null
  const enabled = value === '1'
  setSidebarNavEnabled(enabled)
  return enabled
}

export function isSidebarNavCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
}

export function setSidebarNavCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
}
