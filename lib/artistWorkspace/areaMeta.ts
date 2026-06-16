import type {
  ArtistWorkspaceArea,
  BrandPanel,
  ContentPanel,
  PromotionPanel,
  WorkspaceRoute,
} from '@/lib/artistWorkspaceTabs'
import { ARTIST_WORKSPACE_AREAS } from '@/lib/artistWorkspaceTabs'

export const ARTIST_WORKSPACE_SHEET_OPEN_EVENT = 'songcraft:open-artist-workspace-sheet'

export type ArtistWorkspaceAreaMeta = {
  area: ArtistWorkspaceArea
  icon: string
  labelKey: string
}

export const ARTIST_WORKSPACE_AREA_META: ArtistWorkspaceAreaMeta[] = ARTIST_WORKSPACE_AREAS.map(area => {
  const meta: Record<ArtistWorkspaceArea, Omit<ArtistWorkspaceAreaMeta, 'area'>> = {
    overview: { icon: '⌂', labelKey: 'workspaceShellOverview' },
    content: { icon: '♪', labelKey: 'workspaceShellContent' },
    promotion: { icon: '↗', labelKey: 'workspaceShellPromotion' },
    growth: { icon: '🌱', labelKey: 'workspaceShellGrowth' },
    brand: { icon: '◎', labelKey: 'workspaceShellBrand' },
    settings: { icon: '⚙', labelKey: 'workspaceTabSettings' },
  }
  return { area, ...meta[area] }
})

export type ArtistWorkspaceSheetItem = {
  id: string
  icon: string
  labelKey: string
  descKey: string
  route: WorkspaceRoute
  match: (route: WorkspaceRoute) => boolean
}

export const ARTIST_WORKSPACE_SHEET_ITEMS: ArtistWorkspaceSheetItem[] = [
  {
    id: 'overview',
    icon: '⌂',
    labelKey: 'workspaceShellOverview',
    descKey: 'artistWorkspaceDescOverview',
    route: { area: 'overview' },
    match: r => r.area === 'overview',
  },
  {
    id: 'songs',
    icon: '♪',
    labelKey: 'workspaceShellSongs',
    descKey: 'artistWorkspaceDescSongs',
    route: { area: 'content', contentPanel: 'songs' },
    match: r => r.area === 'content' && (r.contentPanel || 'songs') === 'songs',
  },
  {
    id: 'albums',
    icon: '💿',
    labelKey: 'albums',
    descKey: 'artistWorkspaceDescAlbums',
    route: { area: 'content', contentPanel: 'albums' },
    match: r => r.area === 'content' && r.contentPanel === 'albums',
  },
  {
    id: 'media',
    icon: '🖼',
    labelKey: 'workspaceTabMedia',
    descKey: 'artistWorkspaceDescMedia',
    route: { area: 'content', contentPanel: 'media' },
    match: r => r.area === 'content' && r.contentPanel === 'media',
  },
  {
    id: 'stories',
    icon: '📖',
    labelKey: 'workspaceShellStories',
    descKey: 'artistWorkspaceDescStories',
    route: { area: 'content', contentPanel: 'stories' },
    match: r => r.area === 'content' && r.contentPanel === 'stories',
  },
  {
    id: 'release-campaigns',
    icon: '↗',
    labelKey: 'workspaceTabCampaigns',
    descKey: 'artistWorkspaceDescReleaseCampaigns',
    route: { area: 'promotion', promotionPanel: 'campaigns' },
    match: r => r.area === 'promotion' && (r.promotionPanel || 'campaigns') === 'campaigns',
  },
  {
    id: 'playlist-campaigns',
    icon: '🎧',
    labelKey: 'workspaceTabPlaylists',
    descKey: 'artistWorkspaceDescPlaylistCampaigns',
    route: { area: 'promotion', promotionPanel: 'playlists' },
    match: r => r.area === 'promotion' && r.promotionPanel === 'playlists',
  },
  {
    id: 'growth',
    icon: '🌱',
    labelKey: 'workspaceShellGrowth',
    descKey: 'artistWorkspaceDescGrowth',
    route: { area: 'growth' },
    match: r => r.area === 'growth',
  },
  {
    id: 'public-site',
    icon: '🌐',
    labelKey: 'workspaceTabPublic',
    descKey: 'artistWorkspaceDescPublicSite',
    route: { area: 'brand', brandPanel: 'sharing' },
    match: r => r.area === 'brand' && (r.brandPanel === 'sharing' || r.brandPanel === 'public'),
  },
  {
    id: 'epk',
    icon: '📰',
    labelKey: 'workspaceTabEpk',
    descKey: 'artistWorkspaceDescEpk',
    route: { area: 'brand', brandPanel: 'epk' },
    match: r => r.area === 'brand' && r.brandPanel === 'epk',
  },
  {
    id: 'fanhub',
    icon: '💬',
    labelKey: 'workspaceTabFanHub',
    descKey: 'artistWorkspaceDescFanHub',
    route: { area: 'brand', brandPanel: 'fanhub' },
    match: r => r.area === 'brand' && r.brandPanel === 'fanhub',
  },
  {
    id: 'analytics',
    icon: '📊',
    labelKey: 'workspaceTabAnalytics',
    descKey: 'artistWorkspaceDescAnalytics',
    route: { area: 'brand', brandPanel: 'analytics' },
    match: r => r.area === 'brand' && r.brandPanel === 'analytics',
  },
  {
    id: 'settings',
    icon: '⚙',
    labelKey: 'workspaceTabSettings',
    descKey: 'artistWorkspaceDescSettings',
    route: { area: 'settings' },
    match: r => r.area === 'settings',
  },
]

export type MobileSubNavItem = {
  id: string
  labelKey: string
  route: WorkspaceRoute
  match: (route: WorkspaceRoute) => boolean
}

export function mobileSubNavForArea(area: ArtistWorkspaceArea): MobileSubNavItem[] | null {
  const content: MobileSubNavItem[] = [
    { id: 'songs', labelKey: 'workspaceShellSongs', route: { area: 'content', contentPanel: 'songs' }, match: r => r.area === 'content' && (r.contentPanel || 'songs') === 'songs' },
    { id: 'albums', labelKey: 'albums', route: { area: 'content', contentPanel: 'albums' }, match: r => r.area === 'content' && r.contentPanel === 'albums' },
    { id: 'media', labelKey: 'workspaceTabMedia', route: { area: 'content', contentPanel: 'media' }, match: r => r.area === 'content' && r.contentPanel === 'media' },
    { id: 'stories', labelKey: 'workspaceShellStories', route: { area: 'content', contentPanel: 'stories' }, match: r => r.area === 'content' && r.contentPanel === 'stories' },
  ]
  const promotion: MobileSubNavItem[] = [
    { id: 'campaigns', labelKey: 'workspaceTabCampaigns', route: { area: 'promotion', promotionPanel: 'campaigns' }, match: r => r.area === 'promotion' && (r.promotionPanel || 'campaigns') === 'campaigns' },
    { id: 'playlists', labelKey: 'workspaceTabPlaylists', route: { area: 'promotion', promotionPanel: 'playlists' }, match: r => r.area === 'promotion' && r.promotionPanel === 'playlists' },
  ]
  const brand: MobileSubNavItem[] = [
    { id: 'sharing', labelKey: 'workspaceTabPublic', route: { area: 'brand', brandPanel: 'sharing' }, match: r => r.area === 'brand' && (r.brandPanel === 'sharing' || r.brandPanel === 'public') },
    { id: 'epk', labelKey: 'workspaceTabEpk', route: { area: 'brand', brandPanel: 'epk' }, match: r => r.area === 'brand' && r.brandPanel === 'epk' },
    { id: 'fanhub', labelKey: 'workspaceTabFanHub', route: { area: 'brand', brandPanel: 'fanhub' }, match: r => r.area === 'brand' && r.brandPanel === 'fanhub' },
    { id: 'analytics', labelKey: 'workspaceTabAnalytics', route: { area: 'brand', brandPanel: 'analytics' }, match: r => r.area === 'brand' && r.brandPanel === 'analytics' },
    { id: 'theme', labelKey: 'artistSiteStudioTheme', route: { area: 'brand', brandPanel: 'theme' }, match: r => r.area === 'brand' && r.brandPanel === 'theme' },
  ]

  if (area === 'content') return content
  if (area === 'promotion') return promotion
  if (area === 'brand') return brand
  return null
}

const AREA_LABEL_KEYS: Record<ArtistWorkspaceArea, string> = {
  overview: 'workspaceShellOverview',
  content: 'workspaceShellContent',
  promotion: 'workspaceShellPromotion',
  growth: 'workspaceShellGrowth',
  brand: 'workspaceShellBrand',
  settings: 'workspaceTabSettings',
}

const CONTENT_LABEL: Record<ContentPanel, string> = {
  songs: 'workspaceShellSongs',
  albums: 'albums',
  media: 'workspaceTabMedia',
  stories: 'workspaceShellStories',
}

const PROMOTION_LABEL: Record<PromotionPanel, string> = {
  campaigns: 'workspaceTabCampaigns',
  distribution: 'workspaceShellDistribution',
  playlists: 'workspaceTabPlaylists',
}

const BRAND_LABEL: Partial<Record<BrandPanel, string>> = {
  overview: 'artistSiteStudioOverview',
  theme: 'artistSiteStudioTheme',
  homepage: 'artistSiteStudioHomepage',
  stories: 'artistSiteStudioStories',
  seo: 'artistSiteStudioSeo',
  sharing: 'workspaceTabPublic',
  epk: 'workspaceTabEpk',
  fanhub: 'workspaceTabFanHub',
  events: 'workspaceTabEvents',
  analytics: 'workspaceTabAnalytics',
  presence: 'artistSiteStudioOverview',
  public: 'workspaceTabPublic',
}

/** Label for mini-header / current section. */
export function workspaceSectionLabelKey(route: WorkspaceRoute): string {
  if (route.area === 'content') {
    return CONTENT_LABEL[route.contentPanel || 'songs']
  }
  if (route.area === 'promotion') {
    return PROMOTION_LABEL[route.promotionPanel || 'campaigns']
  }
  if (route.area === 'brand') {
    const panel = route.brandPanel || 'overview'
    return BRAND_LABEL[panel] || AREA_LABEL_KEYS.brand
  }
  return AREA_LABEL_KEYS[route.area]
}
