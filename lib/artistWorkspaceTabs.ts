export type ArtistWorkspaceArea =
  | 'overview'
  | 'content'
  | 'promotion'
  | 'growth'
  | 'brand'
  | 'settings'

export type ContentPanel = 'songs' | 'albums' | 'media' | 'stories'
export type PromotionPanel = 'campaigns' | 'distribution' | 'playlists'
export type BrandPanel =
  | 'overview'
  | 'theme'
  | 'homepage'
  | 'stories'
  | 'seo'
  | 'sharing'
  | 'epk'
  | 'fanhub'
  | 'events'
  | 'analytics'
  | 'presence'
  | 'public'

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

/** Single-segment and legacy tab ids (pre–Phase 54B sidebar). */
const LEGACY_HASH: Record<string, WorkspaceRoute> = {
  overview: { area: 'overview' },
  songs: { area: 'content', contentPanel: 'songs' },
  albums: { area: 'content', contentPanel: 'albums' },
  stories: { area: 'content', contentPanel: 'stories' },
  media: { area: 'content', contentPanel: 'media' },
  campaigns: { area: 'promotion', promotionPanel: 'campaigns' },
  playlists: { area: 'promotion', promotionPanel: 'playlists' },
  growth: { area: 'growth' },
  epk: { area: 'brand', brandPanel: 'epk' },
  public: { area: 'brand', brandPanel: 'sharing' },
  'public-site': { area: 'brand', brandPanel: 'sharing' },
  presence: { area: 'brand', brandPanel: 'overview' },
  fanhub: { area: 'brand', brandPanel: 'fanhub' },
  analytics: { area: 'brand', brandPanel: 'analytics' },
  events: { area: 'brand', brandPanel: 'events' },
  settings: { area: 'settings' },
}

/** Canonical deep-link hashes used by the global sidebar (Phase 54B/54D). */
export const ARTIST_WORKSPACE_DEEP_LINKS: Record<string, WorkspaceRoute> = {
  overview: { area: 'overview' },
  'content-songs': { area: 'content', contentPanel: 'songs' },
  'content-albums': { area: 'content', contentPanel: 'albums' },
  'content-media': { area: 'content', contentPanel: 'media' },
  'content-stories': { area: 'content', contentPanel: 'stories' },
  'promotion-campaigns': { area: 'promotion', promotionPanel: 'campaigns' },
  'promotion-playlists': { area: 'promotion', promotionPanel: 'playlists' },
  growth: { area: 'growth' },
  'brand-public-site': { area: 'brand', brandPanel: 'sharing' },
  'brand-sharing': { area: 'brand', brandPanel: 'sharing' },
  'brand-epk': { area: 'brand', brandPanel: 'epk' },
  'brand-fanhub': { area: 'brand', brandPanel: 'fanhub' },
  'brand-analytics': { area: 'brand', brandPanel: 'analytics' },
  settings: { area: 'settings' },
}

export function parseWorkspaceHash(hash: string): WorkspaceRoute {
  const raw = hash.replace(/^#/, '').trim()
  if (!raw) return { area: 'overview' }
  if (ARTIST_WORKSPACE_DEEP_LINKS[raw]) return ARTIST_WORKSPACE_DEEP_LINKS[raw]
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
    return { area: 'brand', brandPanel: isBrandPanel(panelPart) ? panelPart : 'overview' }
  }
  return { area: areaPart }
}

export function buildWorkspaceHash(route: WorkspaceRoute): string {
  if (route.area === 'content') return `content-${route.contentPanel || 'songs'}`
  if (route.area === 'promotion') return `promotion-${route.promotionPanel || 'campaigns'}`
  if (route.area === 'brand') {
    if (route.brandPanel === 'sharing') return 'brand-public-site'
    return `brand-${route.brandPanel || 'overview'}`
  }
  return route.area
}

/** Normalize any supported hash to the canonical sidebar/deep-link form. */
export function canonicalArtistWorkspaceHash(hash: string): string {
  return buildWorkspaceHash(parseWorkspaceHash(hash))
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
  return v === 'overview' || v === 'theme' || v === 'homepage' || v === 'stories' || v === 'seo' || v === 'sharing'
    || v === 'epk' || v === 'fanhub' || v === 'events' || v === 'analytics'
    || v === 'presence' || v === 'public'
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
