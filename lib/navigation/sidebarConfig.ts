export type SidebarNavItem = {
  id: string
  labelKey: string
  href?: string
  icon: string
  disabled?: boolean
  future?: boolean
  matchPaths?: string[]
}

export type SidebarSection = {
  id: string
  labelKey: string
  icon: string
  items: SidebarNavItem[]
  matchPaths?: string[]
}

export const SIDEBAR_MAIN_SECTIONS: SidebarSection[] = [
  {
    id: 'growth',
    labelKey: 'sidebarNavGrowth',
    icon: '🚀',
    matchPaths: ['/growth', '/discover', '/playbook', '/discover/campaigns'],
    items: [
      { id: 'growth-hub', labelKey: 'growthHubNavLink', href: '/growth', icon: '🌱', matchPaths: ['/growth'] },
      { id: 'communities', labelKey: 'sidebarNavCommunities', href: '/discover/campaigns', icon: '↗', matchPaths: ['/discover/campaigns', '/playlist-campaigns'] },
      { id: 'discover', labelKey: 'discoverNavLink', href: '/discover', icon: '🌍', matchPaths: ['/discover'] },
      { id: 'playbook', labelKey: 'playbookNavLink', href: '/playbook', icon: '🧭', matchPaths: ['/playbook'] },
    ],
  },
  {
    id: 'analytics',
    labelKey: 'sidebarNavAnalytics',
    icon: '📈',
    matchPaths: ['/analytics', '/charts'],
    items: [
      { id: 'account-analytics', labelKey: 'analyticsLabelAccount', href: '/analytics', icon: '📊', matchPaths: ['/analytics'] },
      { id: 'charts', labelKey: 'analyticsLabelCharts', href: '/charts', icon: '📈', matchPaths: ['/charts'] },
      { id: 'reports', labelKey: 'sidebarNavReports', icon: '📋', disabled: true, future: true },
    ],
  },
  {
    id: 'assets',
    labelKey: 'sidebarNavAssets',
    icon: '📦',
    matchPaths: ['/library'],
    items: [
      { id: 'media-library', labelKey: 'mediaLibraryNavLink', href: '/library', icon: '🖼', matchPaths: ['/library'] },
      { id: 'stories', labelKey: 'sidebarNavStories', icon: '📖', matchPaths: [] },
      { id: 'templates', labelKey: 'sidebarNavTemplates', icon: '📄', disabled: true, future: true },
    ],
  },
  {
    id: 'settings',
    labelKey: 'settings',
    icon: '⚙',
    matchPaths: ['/settings', '/profile', '/studio-settings'],
    items: [
      { id: 'profile', labelKey: 'sidebarNavProfile', href: '/profile', icon: '👤', matchPaths: ['/profile'] },
      { id: 'workspace', labelKey: 'sidebarNavWorkspace', href: '/studio-settings', icon: '🏢', matchPaths: ['/studio-settings'] },
      { id: 'billing', labelKey: 'sidebarNavBilling', href: '/settings/billing', icon: '💳', matchPaths: ['/settings/billing'] },
      { id: 'integrations', labelKey: 'sidebarNavIntegrations', icon: '🔌', disabled: true, future: true },
    ],
  },
]

export type ArtistTreeChild = {
  id: string
  labelKey: string
  hash: string
}

export const ARTIST_TREE_CHILDREN: ArtistTreeChild[] = [
  { id: 'overview', labelKey: 'sidebarArtistOverview', hash: 'overview' },
  { id: 'songs', labelKey: 'sidebarArtistSongs', hash: 'content-songs' },
  { id: 'releases', labelKey: 'sidebarArtistReleases', hash: 'promotion-distribution' },
  { id: 'growth', labelKey: 'sidebarArtistGrowth', hash: 'growth' },
  { id: 'public-site', labelKey: 'sidebarArtistPublicSite', hash: 'brand-sharing' },
  { id: 'stories', labelKey: 'sidebarArtistStories', hash: 'content-stories' },
  { id: 'epk', labelKey: 'sidebarArtistEpk', hash: 'brand-epk' },
  { id: 'fanhub', labelKey: 'sidebarArtistFanHub', hash: 'brand-fanhub' },
  { id: 'analytics', labelKey: 'sidebarArtistAnalytics', hash: 'brand-analytics' },
]

export function artistTreeHref(artistId: string, hash: string): string {
  return `/artist/${artistId}${hash ? `#${hash}` : ''}`
}

export function storiesAssetHref(artistId: string | null): string | null {
  if (!artistId) return null
  return artistTreeHref(artistId, 'content-stories')
}

export function isPathActive(pathname: string, matchPaths?: string[]): boolean {
  if (!matchPaths?.length) return false
  return matchPaths.some(p => {
    if (p === '/discover') return pathname === '/discover'
    return pathname === p || pathname.startsWith(`${p}/`)
  })
}

export function isArtistHashActive(hash: string, targetHash: string): boolean {
  const normalized = hash.replace(/^#/, '').trim() || 'overview'
  if (targetHash === 'overview') {
    return normalized === 'overview' || normalized === ''
  }
  return normalized === targetHash || normalized.startsWith(`${targetHash.split('-')[0]}-`)
}
