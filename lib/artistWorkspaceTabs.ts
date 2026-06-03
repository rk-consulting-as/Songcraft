export type ArtistWorkspaceArea =
  | 'overview'
  | 'content'
  | 'promotion'
  | 'growth'
  | 'brand'
  | 'settings'

export type ContentPanel = 'songs' | 'albums' | 'media' | 'stories'
export type PromotionPanel = 'campaigns' | 'distribution' | 'playlists'
export type BrandPanel = 'presence' | 'public' | 'epk' | 'fanhub' | 'events' | 'analytics'

export type WorkspaceRoute = {
  area: ArtistWorkspaceArea
  contentPanel?: ContentPanel
  promotionPanel?: PromotionPanel
  brandPanel?: BrandPanel
}

export const ARTIST_WORKSPACE_AREAS: ArtistWorkspaceArea[] = [
  'overview',
  'content',
  'promotion',
  'growth',
  'brand',
  'settings',
]

/** @deprecated Use ArtistWorkspaceArea — kept for gradual migration */
export type ArtistWorkspaceTab = ArtistWorkspaceArea

export const ARTIST_WORKSPACE_TABS = ARTIST_WORKSPACE_AREAS

const LEGACY_HASH: Record<string, WorkspaceRoute> = {
  overview: { area: 'overview' },
  songs: { area: 'content', contentPanel: 'songs' },
  media: { area: 'content', contentPanel: 'media' },
  campaigns: { area: 'promotion', promotionPanel: 'campaigns' },
  playlists: { area: 'promotion', promotionPanel: 'playlists' },
  growth: { area: 'growth' },
  epk: { area: 'brand', brandPanel: 'epk' },
  public: { area: 'brand', brandPanel: 'public' },
  fanhub: { area: 'brand', brandPanel: 'fanhub' },
  analytics: { area: 'brand', brandPanel: 'analytics' },
  events: { area: 'brand', brandPanel: 'events' },
  settings: { area: 'settings' },
}

export function parseWorkspaceHash(hash: string): WorkspaceRoute {
  const raw = hash.replace(/^#/, '').trim()
  if (!raw) return { area: 'overview' }
  if (LEGACY_HASH[raw]) return LEGACY_HASH[raw]

  const [areaPart, panelPart] = raw.split('-', 2) as [string, string | undefined]
  if (!isArtistWorkspaceArea(areaPart)) return { area: 'overview' }

  if (areaPart === 'content') {
    return { area: 'content', contentPanel: isContentPanel(panelPart) ? panelPart : 'songs' }
  }
  if (areaPart === 'promotion') {
    return { area: 'promotion', promotionPanel: isPromotionPanel(panelPart) ? panelPart : 'campaigns' }
  }
  if (areaPart === 'brand') {
    return { area: 'brand', brandPanel: isBrandPanel(panelPart) ? panelPart : 'presence' }
  }
  return { area: areaPart }
}

export function buildWorkspaceHash(route: WorkspaceRoute): string {
  if (route.area === 'content') return `content-${route.contentPanel || 'songs'}`
  if (route.area === 'promotion') return `promotion-${route.promotionPanel || 'campaigns'}`
  if (route.area === 'brand') return `brand-${route.brandPanel || 'presence'}`
  return route.area
}

export function isArtistWorkspaceArea(value: string): value is ArtistWorkspaceArea {
  return (ARTIST_WORKSPACE_AREAS as string[]).includes(value)
}

export function isArtistWorkspaceTab(value: string): value is ArtistWorkspaceTab {
  return isArtistWorkspaceArea(value) || value in LEGACY_HASH
}

function isContentPanel(v?: string): v is ContentPanel {
  return v === 'songs' || v === 'albums' || v === 'media' || v === 'stories'
}

function isPromotionPanel(v?: string): v is PromotionPanel {
  return v === 'campaigns' || v === 'distribution' || v === 'playlists'
}

function isBrandPanel(v?: string): v is BrandPanel {
  return v === 'presence' || v === 'public' || v === 'epk' || v === 'fanhub' || v === 'events' || v === 'analytics'
}

/** Map legacy tab id (from overview stats etc.) to workspace route */
export function legacyTabToRoute(tab: string): WorkspaceRoute {
  if (LEGACY_HASH[tab]) return LEGACY_HASH[tab]
  if (isArtistWorkspaceArea(tab)) return { area: tab }
  return { area: 'overview' }
}

/** @deprecated Use parseWorkspaceHash */
export function tabFromHash(hash: string): ArtistWorkspaceTab | null {
  const route = parseWorkspaceHash(hash)
  return route.area
}
