export type SongStudioArea =
  | 'overview'
  | 'write'
  | 'produce'
  | 'promote'
  | 'release'
  | 'publish'
  | 'settings'

export type WritePanel = 'lyrics' | 'backstory' | 'dna'
export type ProducePanel = 'suno' | 'cover' | 'canvas'
export type PromotePanel = 'captions' | 'assets'
export type ReleasePanel = 'campaign' | 'distribution'
export type PublishPanel = 'media' | 'publish'

export type SongStudioRoute = {
  area: SongStudioArea
  writePanel?: WritePanel
  producePanel?: ProducePanel
  promotePanel?: PromotePanel
  releasePanel?: ReleasePanel
  publishPanel?: PublishPanel
}

export const SONG_STUDIO_AREAS: SongStudioArea[] = [
  'overview',
  'write',
  'produce',
  'promote',
  'release',
  'publish',
  'settings',
]

/** Legacy panel / hash id used by existing content blocks */
export type LegacySongPanel =
  | 'overview'
  | 'lyrics'
  | 'backstory'
  | 'dna'
  | 'suno'
  | 'cover'
  | 'canvas'
  | 'captions'
  | 'promote-assets'
  | 'campaign'
  | 'distribution'
  | 'media'
  | 'publish'
  | 'settings'

/** Canonical deep-link hashes (global sidebar + share links). */
export const SONG_STUDIO_DEEP_LINKS: Record<string, SongStudioRoute> = {
  overview: { area: 'overview' },
  'write-lyrics': { area: 'write', writePanel: 'lyrics' },
  'write-backstory': { area: 'write', writePanel: 'backstory' },
  'write-dna': { area: 'write', writePanel: 'dna' },
  'produce-suno': { area: 'produce', producePanel: 'suno' },
  'produce-cover': { area: 'produce', producePanel: 'cover' },
  'produce-canvas': { area: 'produce', producePanel: 'canvas' },
  'promote-captions': { area: 'promote', promotePanel: 'captions' },
  'promote-assets': { area: 'promote', promotePanel: 'assets' },
  'release-campaign': { area: 'release', releasePanel: 'campaign' },
  'release-distribution': { area: 'release', releasePanel: 'distribution' },
  'publish-media': { area: 'publish', publishPanel: 'media' },
  'publish-share': { area: 'publish', publishPanel: 'publish' },
  'settings-metadata': { area: 'settings' },
}

const LEGACY_HASH: Record<string, SongStudioRoute> = {
  overview: { area: 'overview' },
  lyrics: { area: 'write', writePanel: 'lyrics' },
  backstory: { area: 'write', writePanel: 'backstory' },
  dna: { area: 'write', writePanel: 'dna' },
  suno: { area: 'produce', producePanel: 'suno' },
  cover: { area: 'produce', producePanel: 'cover' },
  canvas: { area: 'produce', producePanel: 'canvas' },
  captions: { area: 'promote', promotePanel: 'captions' },
  'campaign-copy': { area: 'promote', promotePanel: 'assets' },
  'promote-assets': { area: 'promote', promotePanel: 'assets' },
  'promote-captions': { area: 'promote', promotePanel: 'captions' },
  campaign: { area: 'release', releasePanel: 'campaign' },
  distribution: { area: 'release', releasePanel: 'distribution' },
  media: { area: 'publish', publishPanel: 'media' },
  publish: { area: 'publish', publishPanel: 'publish' },
  'publish-share': { area: 'publish', publishPanel: 'publish' },
  'publish-media': { area: 'publish', publishPanel: 'media' },
  comments: { area: 'overview' },
  settings: { area: 'settings' },
  'settings-metadata': { area: 'settings' },
}

function warnUnknownSongStudioHash(raw: string) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[ViaTone] Unknown song studio hash "${raw}" — showing Overview.`)
  }
}

export function parseSongStudioHash(hash: string): SongStudioRoute {
  const raw = hash.replace(/^#/, '').trim()
  if (!raw) return { area: 'overview' }
  if (SONG_STUDIO_DEEP_LINKS[raw]) return { ...SONG_STUDIO_DEEP_LINKS[raw] }
  if (LEGACY_HASH[raw]) return { ...LEGACY_HASH[raw] }

  const [areaPart, panelPart] = raw.split('-', 2)
  if (!isSongStudioArea(areaPart)) {
    warnUnknownSongStudioHash(raw)
    return { area: 'overview' }
  }

  if (areaPart === 'write') {
    return { area: 'write', writePanel: isWritePanel(panelPart) ? panelPart : 'lyrics' }
  }
  if (areaPart === 'produce') {
    return { area: 'produce', producePanel: isProducePanel(panelPart) ? panelPart : 'suno' }
  }
  if (areaPart === 'promote') {
    if (panelPart === 'assets' || panelPart === 'campaign-copy') {
      return { area: 'promote', promotePanel: 'assets' }
    }
    return { area: 'promote', promotePanel: isPromotePanel(panelPart) ? panelPart : 'captions' }
  }
  if (areaPart === 'release') {
    return { area: 'release', releasePanel: isReleasePanel(panelPart) ? panelPart : 'campaign' }
  }
  if (areaPart === 'publish') {
    if (panelPart === 'share') return { area: 'publish', publishPanel: 'publish' }
    return { area: 'publish', publishPanel: isPublishPanel(panelPart) ? panelPart : 'media' }
  }
  if (areaPart === 'settings') {
    return { area: 'settings' }
  }
  return { area: areaPart }
}

/** Prefer new-style hashes; legacy single-word hashes still parse via parseSongStudioHash. */
export function buildSongStudioHash(route: SongStudioRoute): string {
  if (route.area === 'overview') return ''
  if (route.area === 'settings') return 'settings-metadata'
  if (route.area === 'write') return `write-${route.writePanel || 'lyrics'}`
  if (route.area === 'produce') return `produce-${route.producePanel || 'suno'}`
  if (route.area === 'promote') {
    return route.promotePanel === 'assets' ? 'promote-assets' : 'promote-captions'
  }
  if (route.area === 'release') return `release-${route.releasePanel || 'campaign'}`
  if (route.area === 'publish') {
    return route.publishPanel === 'publish' ? 'publish-share' : 'publish-media'
  }
  return route.area
}

/** Normalize any supported hash to canonical form used in the URL. */
export function canonicalSongStudioHash(hash: string): string {
  const built = buildSongStudioHash(parseSongStudioHash(hash))
  return built || 'overview'
}

export function getActivePanel(route: SongStudioRoute): LegacySongPanel {
  if (route.area === 'overview') return 'overview'
  if (route.area === 'settings') return 'settings'
  if (route.area === 'write') return route.writePanel || 'lyrics'
  if (route.area === 'produce') return route.producePanel || 'suno'
  if (route.area === 'promote') {
    return route.promotePanel === 'assets' ? 'promote-assets' : 'captions'
  }
  if (route.area === 'release') return route.releasePanel || 'campaign'
  if (route.area === 'publish') return route.publishPanel || 'media'
  return 'lyrics'
}

export function legacyPanelToRoute(panel: string): SongStudioRoute {
  if (panel === 'promote-assets') return { area: 'promote', promotePanel: 'assets' }
  if (LEGACY_HASH[panel]) return LEGACY_HASH[panel]
  if (isSongStudioArea(panel)) return { area: panel }
  return { area: 'overview' }
}

export function defaultPanelForArea(area: SongStudioArea): SongStudioRoute {
  switch (area) {
    case 'write': return { area: 'write', writePanel: 'lyrics' }
    case 'produce': return { area: 'produce', producePanel: 'suno' }
    case 'promote': return { area: 'promote', promotePanel: 'captions' }
    case 'release': return { area: 'release', releasePanel: 'campaign' }
    case 'publish': return { area: 'publish', publishPanel: 'media' }
    case 'settings': return { area: 'settings' }
    default: return { area: 'overview' }
  }
}

function isSongStudioArea(v: string): v is SongStudioArea {
  return (SONG_STUDIO_AREAS as string[]).includes(v)
}

function isWritePanel(v?: string): v is WritePanel {
  return v === 'lyrics' || v === 'backstory' || v === 'dna'
}

function isProducePanel(v?: string): v is ProducePanel {
  return v === 'suno' || v === 'cover' || v === 'canvas'
}

function isPromotePanel(v?: string): v is PromotePanel {
  return v === 'captions' || v === 'assets'
}

function isReleasePanel(v?: string): v is ReleasePanel {
  return v === 'campaign' || v === 'distribution'
}

function isPublishPanel(v?: string): v is PublishPanel {
  return v === 'media' || v === 'publish'
}
