'use client'

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  applySidebarNavQueryParam,
  isSidebarNavEnabled,
  SIDEBAR_NAV_CHANGED_EVENT,
} from '@/lib/navigation/featureFlags'
import {
  computeSidebarVisibility,
  readIsDesktop,
  SIDEBAR_DESKTOP_MQ,
} from '@/lib/navigation/sidebarVisibility'
import { NavigationProvider } from '@/components/navigation/NavigationProvider'
import AppSidebar, { useSidebarCollapsedState } from '@/components/navigation/AppSidebar'
import AppSidebarFallback from '@/components/navigation/AppSidebarFallback'
import AppTopBar from '@/components/navigation/AppTopBar'
import SidebarNavDebugPanel from '@/components/navigation/SidebarNavDebugPanel'
import WorkspaceHeader from '@/components/navigation/WorkspaceHeader'

function AppNavigationShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [enabled, setEnabled] = useState(() => (typeof window !== 'undefined' ? isSidebarNavEnabled() : false))
  const [authenticated, setAuthenticated] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => readIsDesktop())
  const [ready, setReady] = useState(false)
  const [navDataFailed, setNavDataFailed] = useState(false)
  const [syncTick, setSyncTick] = useState(0)
  const { collapsed, toggleCollapsed } = useSidebarCollapsedState()

  const syncEnabled = useCallback(() => {
    setEnabled(isSidebarNavEnabled())
    setSyncTick(t => t + 1)
  }, [])

  useEffect(() => {
    const sidebarParam = searchParams?.get('sidebar') ?? null
    const applied = applySidebarNavQueryParam(sidebarParam)
    if (applied !== null) {
      setEnabled(applied)
      try {
        const params = new URLSearchParams(window.location.search)
        params.delete('sidebar')
        const qs = params.toString()
        const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
        window.history.replaceState({}, '', next)
      } catch { /* noop */ }
    } else {
      syncEnabled()
    }
  }, [searchParams, syncEnabled])

  useEffect(() => {
    syncEnabled()
    window.addEventListener('storage', syncEnabled)
    window.addEventListener(SIDEBAR_NAV_CHANGED_EVENT, syncEnabled)
    return () => {
      window.removeEventListener('storage', syncEnabled)
      window.removeEventListener(SIDEBAR_NAV_CHANGED_EVENT, syncEnabled)
    }
  }, [syncEnabled])

  useEffect(() => {
    setIsDesktop(readIsDesktop())
    const mq = window.matchMedia(SIDEBAR_DESKTOP_MQ)
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled) {
        setAuthenticated(!!user)
        setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [pathname])

  const visibility = useMemo(
    () => computeSidebarVisibility({ pathname, isDesktop, isAuthenticated: authenticated, enabled }),
    [pathname, isDesktop, authenticated, enabled, syncTick],
  )

  const showShell = visibility.sidebarActive
  const showDevPanel = process.env.NODE_ENV !== 'production' && ready && authenticated && isDesktop && !visibility.isExcludedRoute

  useEffect(() => {
    document.body.dataset.sidebarNavV1 = showShell ? '1' : '0'
    return () => {
      delete document.body.dataset.sidebarNavV1
    }
  }, [showShell])

  if (!ready) {
    return <>{children}</>
  }

  const sidebarNode = navDataFailed ? (
    <AppSidebarFallback collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
  ) : (
    <AppSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
  )

  if (!showShell) {
    return (
      <>
        {showDevPanel && <SidebarNavDebugPanel state={visibility} onRefresh={syncEnabled} />}
        {children}
      </>
    )
  }

  return (
    <>
      {showDevPanel && <SidebarNavDebugPanel state={visibility} onRefresh={syncEnabled} />}
      <NavigationProvider onLoadError={() => setNavDataFailed(true)}>
        <div className={`app-nav-shell workspace-sidebar-layout${collapsed ? ' app-nav-shell--collapsed' : ''}`}>
          {sidebarNode}
          <div className="app-nav-shell__main">
            <AppTopBar />
            <div className="app-nav-shell__context">
              <WorkspaceHeader />
            </div>
            <div className="app-nav-shell__content">{children}</div>
          </div>
        </div>
      </NavigationProvider>
    </>
  )
}

export default function AppNavigationShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AppNavigationShellInner>{children}</AppNavigationShellInner>
    </Suspense>
  )
}
