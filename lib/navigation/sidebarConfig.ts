import { canonicalArtistWorkspaceHash } from '@/lib/artistWorkspaceTabs'
import { parseSongStudioHash } from '@/lib/songStudio/routes'

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

export type ArtistTreeNode = {
  id: string
  labelKey: string
  hash?: string
  children?: ArtistTreeNode[]
}

export type SongTreeNode = {
  id: string
  labelKey: string
  hash: string
}

export const ARTIST_TREE: ArtistTreeNode[] = [
  { id: 'overview', labelKey: 'sidebarArtistOverview', hash: 'overview' },
  {
    id: 'content',
    labelKey: 'sidebarArtistContent',
    children: [
      { id: 'songs', labelKey: 'sidebarArtistSongs', hash: 'content-songs' },
      { id: 'albums', labelKey: 'sidebarArtistAlbums', hash: 'content-albums' },
      { id: 'media', labelKey: 'sidebarArtistMedia', hash: 'content-media' },
      { id: 'stories', labelKey: 'sidebarArtistStories', hash: 'content-stories' },
    ],
  },
  {
    id: 'promotion',
    labelKey: 'sidebarArtistPromotion',
    children: [
      { id: 'release-campaigns', labelKey: 'sidebarArtistReleaseCampaigns', hash: 'promotion-campaigns' },
      { id: 'playlist-campaigns', labelKey: 'sidebarArtistPlaylistCampaigns', hash: 'promotion-playlists' },
    ],
  },
  { id: 'growth', labelKey: 'sidebarArtistGrowth', hash: 'growth' },
  {
    id: 'brand',
    labelKey: 'sidebarArtistBrand',
    children: [
      { id: 'public-site', labelKey: 'sidebarArtistPublicSite', hash: 'brand-public-site' },
      { id: 'epk', labelKey: 'sidebarArtistEpk', hash: 'brand-epk' },
      { id: 'fanhub', labelKey: 'sidebarArtistFanHub', hash: 'brand-fanhub' },
    ],
  },
  { id: 'analytics', labelKey: 'sidebarArtistAnalytics', hash: 'brand-analytics' },
  { id: 'settings', labelKey: 'settings', hash: 'settings' },
]

export const SONG_TREE: SongTreeNode[] = [
  { id: 'overview', labelKey: 'songStudioOverview', hash: '' },
  { id: 'lyrics', labelKey: 'lyrics', hash: 'write-lyrics' },
  { id: 'backstory', labelKey: 'backstory', hash: 'write-backstory' },
  { id: 'dna', labelKey: 'songDnaTab', hash: 'write-dna' },
  { id: 'suno', labelKey: 'sunoTitle', hash: 'produce-suno' },
  { id: 'cover', labelKey: 'cover', hash: 'produce-cover' },
  { id: 'canvas', labelKey: 'canvas', hash: 'produce-canvas' },
  { id: 'promote', labelKey: 'songStudioPromote', hash: 'promote-captions' },
  { id: 'release', labelKey: 'songStudioRelease', hash: 'release-campaign' },
  { id: 'publish', labelKey: 'songStudioPublish', hash: 'publish-media' },
  { id: 'settings', labelKey: 'songStudioSettings', hash: 'settings-metadata' },
]

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

export function artistTreeHref(artistId: string, hash: string): string {
  return `/artist/${artistId}${hash ? `#${hash}` : ''}`
}

export function songTreeHref(songId: string, hash: string): string {
  return `/song/${songId}${hash ? `#${hash}` : ''}`
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

export function normalizePageHash(hash: string): string {
  return hash.replace(/^#/, '').trim()
}

export function isArtistHashActive(pageHash: string, targetHash: string): boolean {
  const page = canonicalArtistWorkspaceHash(normalizePageHash(pageHash) || 'overview')
  const target = canonicalArtistWorkspaceHash(targetHash)
  if (target === 'overview') {
    return page === 'overview'
  }
  return page === target
}

export function isArtistTreeGroupActive(pageHash: string, node: ArtistTreeNode): boolean {
  if (node.hash && isArtistHashActive(pageHash, node.hash)) return true
  return (node.children || []).some(child => isArtistTreeGroupActive(pageHash, child))
}

export function isArtistTreeLeafActive(pageHash: string, hash?: string): boolean {
  if (!hash) return false
  return isArtistHashActive(pageHash, hash)
}

export function isSongTreeHashActive(pageHash: string, targetHash: string): boolean {
  const normalized = normalizePageHash(pageHash)
  if (!targetHash || targetHash === '') {
    return normalized === '' || normalized === 'overview'
  }
  if (normalized === targetHash) return true
  const route = parseSongStudioHash(`#${normalized}`)
  const targetRoute = parseSongStudioHash(`#${targetHash}`)
  if (route.area !== targetRoute.area) return false
  if (route.area === 'overview' || route.area === 'settings') return true
  if (route.area === 'write') return route.writePanel === targetRoute.writePanel
  if (route.area === 'produce') return route.producePanel === targetRoute.producePanel
  if (route.area === 'promote') return route.promotePanel === targetRoute.promotePanel
  if (route.area === 'release') return route.releasePanel === targetRoute.releasePanel
  if (route.area === 'publish') return route.publishPanel === targetRoute.publishPanel
  return false
}

export function collectArtistTreeHashes(nodes: ArtistTreeNode[]): string[] {
  const hashes: string[] = []
  for (const node of nodes) {
    if (node.hash) hashes.push(node.hash)
    if (node.children) hashes.push(...collectArtistTreeHashes(node.children))
  }
  return hashes
}
