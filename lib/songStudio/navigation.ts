'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import {
  buildSongStudioHash,
  canonicalSongStudioHash,
  parseSongStudioHash,
  type SongStudioRoute,
} from '@/lib/songStudio/routes'

const DEFAULT_ROUTE: SongStudioRoute = { area: 'overview' }

const songStudioHashListeners = new Set<() => void>()

function notifySongStudioHashListeners() {
  songStudioHashListeners.forEach(listener => listener())
}

function subscribeSongStudioHash(listener: () => void) {
  songStudioHashListeners.add(listener)
  const onNativeHash = () => listener()
  window.addEventListener('hashchange', onNativeHash)
  window.addEventListener('popstate', onNativeHash)
  return () => {
    songStudioHashListeners.delete(listener)
    window.removeEventListener('hashchange', onNativeHash)
    window.removeEventListener('popstate', onNativeHash)
  }
}

function readSongStudioHashKey(): string {
  if (typeof window === 'undefined') return 'overview'
  const key = canonicalSongStudioHash(window.location.hash)
  return key || 'overview'
}

function routeFromHashKey(hashKey: string): SongStudioRoute {
  return parseSongStudioHash(hashKey === 'overview' ? '' : `#${hashKey}`)
}

/** Push/replace song studio hash and notify subscribers (Next.js may skip hashchange). */
export function applySongStudioHash(hash: string, options?: { replace?: boolean }) {
  if (typeof window === 'undefined') return
  const normalized = hash.replace(/^#/, '').trim()
  const next = normalized ? `#${normalized}` : ''
  const nextUrl = `${window.location.pathname}${window.location.search}${next}`
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

  if (currentUrl !== nextUrl) {
    if (options?.replace) {
      window.history.replaceState(null, '', nextUrl)
    } else {
      window.history.pushState(null, '', nextUrl)
    }
  }

  window.dispatchEvent(new HashChangeEvent('hashchange'))
  notifySongStudioHashListeners()
}

export function useSongStudioRouteFromHash() {
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  useLayoutEffect(() => {
    setHydrated(true)
  }, [pathname])

  const hashKey = useSyncExternalStore(
    subscribeSongStudioHash,
    () => (hydrated ? readSongStudioHashKey() : 'overview'),
    () => 'overview',
  )

  const route = useMemo(() => routeFromHashKey(hashKey), [hashKey])

  useEffect(() => {
    if (hydrated) notifySongStudioHashListeners()
  }, [hydrated, pathname])

  return route
}

export function useSongStudioRouteController() {
  const studioRoute = useSongStudioRouteFromHash()

  const applyStudioRoute = useCallback((route: SongStudioRoute) => {
    applySongStudioHash(buildSongStudioHash(route), { replace: true })
  }, [])

  return { studioRoute, applyStudioRoute }
}
