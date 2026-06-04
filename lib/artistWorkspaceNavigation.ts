'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  buildWorkspaceHash,
  parseWorkspaceHash,
  type WorkspaceRoute,
} from '@/lib/artistWorkspaceTabs'

const DEFAULT_ROUTE: WorkspaceRoute = {
  area: 'overview',
  contentPanel: 'songs',
  promotionPanel: 'campaigns',
  brandPanel: 'overview',
}

/** Push/replace location hash and notify listeners (Next.js same-page hash links may skip hashchange). */
export function applyArtistWorkspaceHash(hash: string, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return
  const normalized = hash.replace(/^#/, '').trim()
  const nextUrl = `${window.location.pathname}${window.location.search}#${normalized}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

  if (currentUrl === nextUrl) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }

  if (options?.replace) {
    window.history.replaceState(null, '', nextUrl)
  } else {
    window.history.pushState(null, '', nextUrl)
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function workspaceScrollAnchorId(route: WorkspaceRoute): string | null {
  if (route.area === 'overview') return 'workspace-overview'
  if (route.area === 'content') return `workspace-content-${route.contentPanel || 'songs'}`
  if (route.area === 'promotion') return `workspace-promotion-${route.promotionPanel || 'campaigns'}`
  if (route.area === 'brand') {
    const panel = route.brandPanel === 'sharing' ? 'public-site' : route.brandPanel || 'overview'
    return `workspace-brand-${panel}`
  }
  if (route.area === 'growth') return 'workspace-growth'
  if (route.area === 'settings') return 'workspace-settings'
  return null
}

export function scrollToWorkspaceAnchor(route: WorkspaceRoute) {
  if (typeof window === 'undefined') return
  const id = workspaceScrollAnchorId(route)
  if (!id) return
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

export function useWorkspaceRouteFromHash() {
  const pathname = usePathname()
  const [route, setRoute] = useState<WorkspaceRoute>(DEFAULT_ROUTE)

  const syncFromLocation = useCallback(() => {
    if (typeof window === 'undefined') return
    setRoute(parseWorkspaceHash(window.location.hash))
  }, [])

  useEffect(() => {
    syncFromLocation()
    const onHash = () => syncFromLocation()
    window.addEventListener('hashchange', onHash)
    window.addEventListener('popstate', onHash)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('popstate', onHash)
    }
  }, [pathname, syncFromLocation])

  return route
}

export function useWorkspaceRouteController() {
  const pathname = usePathname()
  const workspaceRoute = useWorkspaceRouteFromHash()

  const applyWorkspaceRoute = useCallback((route: WorkspaceRoute) => {
    applyArtistWorkspaceHash(buildWorkspaceHash(route), { replace: true })
  }, [])

  useEffect(() => {
    scrollToWorkspaceAnchor(workspaceRoute)
  }, [workspaceRoute, pathname])

  return { workspaceRoute, applyWorkspaceRoute }
}
