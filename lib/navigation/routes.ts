/** Routes where the global sidebar shell should not mount (public / embed / auth). */
export function isSidebarNavExcluded(pathname: string | null): boolean {
  if (!pathname) return true
  if (pathname === '/') return true
  if (pathname.startsWith('/login')) return true
  if (pathname.startsWith('/embed')) return true
  if (pathname.startsWith('/p/')) return true
  if (pathname.startsWith('/s/')) return true
  if (pathname.startsWith('/epk/')) return true
  if (pathname.startsWith('/admin')) return true
  return false
}

export function parseArtistIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null
  const match = pathname.match(/^\/artist\/([^/]+)/)
  return match?.[1] ?? null
}

export function parseSongIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null
  const match = pathname.match(/^\/song\/([^/]+)/)
  return match?.[1] ?? null
}

export function parseArtistIdFromSearch(search: string): string | null {
  if (!search) return null
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
    return params.get('artist')
  } catch {
    return null
  }
}
