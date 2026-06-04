'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  buildWorkspaceHash,
  canonicalArtistWorkspaceHash,
  parseWorkspaceHash,
  type WorkspaceRoute,
} from '@/lib/artistWorkspaceTabs'

const DEFAULT_ROUTE: WorkspaceRoute = {
  area: 'overview',
  contentPanel: 'songs',
  promotionPanel: 'campaigns',
  brandPanel: 'overview',
}

const workspaceHashListeners = new Set<() => void>()

function notifyWorkspaceHashListeners() {
  workspaceHashListeners.forEach(listener => listener())
}

function subscribeWorkspaceHash(listener: () => void) {
  workspaceHashListeners.add(listener)
  const onNativeHash = () => listener()
  window.addEventListener('hashchange', onNativeHash)
  window.addEventListener('popstate', onNativeHash)
  return () => {
    workspaceHashListeners.delete(listener)
    window.removeEventListener('hashchange', onNativeHash)
    window.removeEventListener('popstate', onNativeHash)
  }
}

/** Stable primitive snapshot for useSyncExternalStore (object snapshots cause infinite re-renders). */
function readWorkspaceHashKey(): string {
  if (typeof window === 'undefined') return 'overview'
  return canonicalArtistWorkspaceHash(window.location.hash)
}

function routeFromHashKey(hashKey: string): WorkspaceRoute {
  return parseWorkspaceHash(hashKey ? `#${hashKey}` : '')
}

/** Push/replace location hash and notify route subscribers (Next.js may skip hashchange). */
export function applyArtistWorkspaceHash(hash: string, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return
  const normalized = hash.replace(/^#/, '').trim()
  const nextUrl = `${window.location.pathname}${window.location.search}#${normalized}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

  if (currentUrl !== nextUrl) {
    if (options?.replace) {
      window.history.replaceState(null, '', nextUrl)
    } else {
      window.history.pushState(null, '', nextUrl)
    }
  }

  window.dispatchEvent(new HashChangeEvent('hashchange'))
  notifyWorkspaceHashListeners()
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

/**
 * Hash-driven workspace route.
 * Uses a string snapshot + client hydration gate to avoid infinite re-renders and SSR mismatch.
 */
export function useWorkspaceRouteFromHash() {
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  useLayoutEffect(() => {
    setHydrated(true)
  }, [pathname])

  const hashKey = useSyncExternalStore(
    subscribeWorkspaceHash,
    () => (hydrated ? readWorkspaceHashKey() : 'overview'),
    () => 'overview',
  )

  const route = useMemo(() => routeFromHashKey(hashKey), [hashKey])

  useEffect(() => {
    if (hydrated) notifyWorkspaceHashListeners()
  }, [hydrated, pathname])

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
