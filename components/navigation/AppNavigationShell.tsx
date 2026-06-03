'use client'

import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { isSidebarNavEnabled } from '@/lib/navigation/featureFlags'
import { isSidebarNavExcluded } from '@/lib/navigation/routes'
import { NavigationProvider } from '@/components/navigation/NavigationProvider'
import AppSidebar, { useSidebarCollapsedState } from '@/components/navigation/AppSidebar'
import AppTopBar from '@/components/navigation/AppTopBar'
import WorkspaceHeader, { AppBreadcrumbs } from '@/components/navigation/WorkspaceHeader'

const DESKTOP_MQ = '(min-width: 761px)'

function AppNavigationShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [enabled, setEnabled] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [ready, setReady] = useState(false)
  const { collapsed, toggleCollapsed } = useSidebarCollapsedState()

  useEffect(() => {
    setEnabled(isSidebarNavEnabled())
    const onStorage = () => setEnabled(isSidebarNavEnabled())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
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

  useEffect(() => {
    const active = enabled && authenticated && isDesktop && !isSidebarNavExcluded(pathname)
    document.body.dataset.sidebarNavV1 = active ? '1' : '0'
    return () => {
      delete document.body.dataset.sidebarNavV1
    }
  }, [enabled, authenticated, isDesktop, pathname])

  const showShell = enabled && authenticated && isDesktop && !isSidebarNavExcluded(pathname)

  if (!ready || !showShell) {
    return <>{children}</>
  }

  return (
    <NavigationProvider>
      <div className={`app-nav-shell${collapsed ? ' app-nav-shell--collapsed' : ''}`}>
        <AppSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        <div className="app-nav-shell__main">
          <AppTopBar />
          <div className="app-nav-shell__context">
            <WorkspaceHeader />
            <AppBreadcrumbs />
          </div>
          <div className="app-nav-shell__content">{children}</div>
        </div>
      </div>
    </NavigationProvider>
  )
}

export default function AppNavigationShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AppNavigationShellInner>{children}</AppNavigationShellInner>
    </Suspense>
  )
}
