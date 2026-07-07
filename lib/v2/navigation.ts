import { V2_ROUTES } from './routes'

export type V2NavItem = {
  id: string
  label: string
  href: string
  badge?: string
  matchPrefix?: string
}

export const V2_NAV_ITEMS: V2NavItem[] = [
  { id: 'community', label: 'Community', href: V2_ROUTES.home, badge: 'Live', matchPrefix: '/community' },
  { id: 'circles', label: 'Circles', href: V2_ROUTES.circles, matchPrefix: '/community/circles' },
  { id: 'sessions', label: 'Sessions', href: V2_ROUTES.sessions, badge: '3', matchPrefix: '/community/sessions' },
  { id: 'artists', label: 'Artists', href: V2_ROUTES.artists, matchPrefix: '/community/artists' },
  { id: 'songs', label: 'Songs', href: V2_ROUTES.songs, matchPrefix: '/community/songs' },
  { id: 'playlists', label: 'Playlists', href: V2_ROUTES.playlists, matchPrefix: '/community/playlists' },
  { id: 'host', label: 'Host', href: V2_ROUTES.host, matchPrefix: '/community/host' },
  { id: 'pricing', label: 'Pricing', href: V2_ROUTES.pricing, matchPrefix: '/community/pricing' },
]

export function isV2NavActive(pathname: string, item: V2NavItem): boolean {
  if (item.id === 'community') {
    return pathname === '/community'
  }
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
  }
  return pathname === item.href
}
