import { V2_ROUTES } from './routes'

export type V2NavItem = {
  id: string
  label: string
  href: string
  badge?: string
  matchPrefix?: string
}

export const V2_NAV_ITEMS: V2NavItem[] = [
  { id: 'community', label: 'Discover', href: V2_ROUTES.explore, badge: 'Live', matchPrefix: '/community/explore' },
  { id: 'playlists', label: 'Curator Rooms', href: V2_ROUTES.playlists, matchPrefix: '/community/playlists' },
  { id: 'sessions', label: 'Live Sessions', href: V2_ROUTES.sessions, badge: '3', matchPrefix: '/community/sessions' },
  { id: 'calendar', label: 'Calendar', href: V2_ROUTES.calendar, matchPrefix: '/community/calendar' },
  { id: 'saved', label: 'Saved', href: V2_ROUTES.saved, matchPrefix: '/community/saved' },
  { id: 'host', label: 'Host', href: V2_ROUTES.host, matchPrefix: '/community/host' },
  { id: 'circles', label: 'Circles', href: V2_ROUTES.circles, matchPrefix: '/community/circles' },
  { id: 'artists', label: 'Artists', href: V2_ROUTES.artists, matchPrefix: '/community/artists' },
  { id: 'songs', label: 'Songs', href: V2_ROUTES.songs, matchPrefix: '/community/songs' },
  { id: 'pricing', label: 'Pricing', href: V2_ROUTES.pricing, matchPrefix: '/community/pricing' },
]

export function isV2NavActive(pathname: string, item: V2NavItem): boolean {
  if (item.id === 'community') {
    return pathname === '/community' || pathname === '/community/explore' || pathname.startsWith('/community/explore')
  }
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
  }
  return pathname === item.href
}
