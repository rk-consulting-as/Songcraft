'use client'

import type { SidebarVisibilityState } from '@/lib/navigation/sidebarVisibility'
import { setSidebarNavEnabled } from '@/lib/navigation/featureFlags'
import { t, useLang } from '@/lib/i18n'

type Props = {
  state: SidebarVisibilityState
  onRefresh: () => void
}

function boolLabel(v: boolean) {
  return v ? 'true' : 'false'
}

export default function SidebarNavDebugPanel({ state, onRefresh }: Props) {
  const tx = t[useLang()] as Record<string, string>

  if (process.env.NODE_ENV === 'production') return null

  const enable = () => {
    setSidebarNavEnabled(true)
    onRefresh()
    window.location.reload()
  }

  const disable = () => {
    setSidebarNavEnabled(false)
    onRefresh()
    window.location.reload()
  }

  return (
    <div className="sidebar-nav-debug-panel" role="status" aria-live="polite">
      <div className="sidebar-nav-debug-panel__head">
        <strong>{tx.sidebarNavDebugTitle}</strong>
        {!state.sidebarActive && (
          <button type="button" className="sidebar-nav-debug-panel__enable" onClick={enable}>
            {tx.sidebarNavEnableButton}
          </button>
        )}
        {state.sidebarActive && (
          <button type="button" className="sidebar-nav-debug-panel__enable sidebar-nav-debug-panel__enable--off" onClick={disable}>
            {tx.sidebarNavDisableButton}
          </button>
        )}
      </div>
      <dl className="sidebar-nav-debug-panel__grid">
        <div><dt>env NEXT_PUBLIC_SIDEBAR_NAV_V1</dt><dd>{state.envFlag}</dd></div>
        <div><dt>localStorage {`viatone_sidebar_nav_v1`}</dt><dd>{state.localStorageOverride ?? '(unset)'}</dd></div>
        <div><dt>isDesktop</dt><dd>{boolLabel(state.isDesktop)}</dd></div>
        <div><dt>isExcludedRoute</dt><dd>{boolLabel(state.isExcludedRoute)}</dd></div>
        <div><dt>isAuthenticated</dt><dd>{boolLabel(state.isAuthenticated)}</dd></div>
        <div><dt>enabled</dt><dd>{boolLabel(state.enabled)}</dd></div>
        <div><dt>sidebarActive</dt><dd>{boolLabel(state.sidebarActive)}</dd></div>
      </dl>
      <p className="sidebar-nav-debug-panel__hint">{tx.sidebarNavDebugHint}</p>
    </div>
  )
}
