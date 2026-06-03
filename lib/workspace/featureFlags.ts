const SIDEBAR_KEY = 'viatone_workspace_sidebar_v1'

/** Desktop sidebar rollout — localStorage override or env default. */
export function isWorkspaceSidebarEnabled(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WORKSPACE_SIDEBAR_V1 === '1'
  }
  const stored = localStorage.getItem(SIDEBAR_KEY)
  if (stored === '1') return true
  if (stored === '0') return false
  return process.env.NEXT_PUBLIC_WORKSPACE_SIDEBAR_V1 === '1'
}

export function setWorkspaceSidebarEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIDEBAR_KEY, enabled ? '1' : '0')
}
