const SIDEBAR_NAV_KEY = 'viatone_sidebar_nav_v1'
const SIDEBAR_COLLAPSED_KEY = 'viatone_sidebar_nav_collapsed'

/** Env default for sidebar nav (NEXT_PUBLIC_SIDEBAR_NAV_V1=1). */
export function getSidebarNavEnvDefault(): boolean {
  return process.env.NEXT_PUBLIC_SIDEBAR_NAV_V1 === '1'
}

/** Global desktop sidebar rollout — localStorage override or env default. */
export function isSidebarNavEnabled(): boolean {
  if (typeof window === 'undefined') {
    return getSidebarNavEnvDefault()
  }
  const stored = localStorage.getItem(SIDEBAR_NAV_KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return getSidebarNavEnvDefault()
}

export function setSidebarNavEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIDEBAR_NAV_KEY, enabled ? '1' : '0')
}

export function isSidebarNavCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
}

export function setSidebarNavCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
}
