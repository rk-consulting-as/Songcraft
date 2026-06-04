/**
 * Workspace hash routing tests — run: npx --yes tsx lib/artistWorkspaceTabs.test.ts
 */
import {
  buildWorkspaceHash,
  canonicalArtistWorkspaceHash,
  parseWorkspaceHash,
  type WorkspaceRoute,
} from './artistWorkspaceTabs'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function expectRoute(hash: string, expected: WorkspaceRoute) {
  const route = parseWorkspaceHash(hash)
  assert(route.area === expected.area, `${hash}: area ${route.area} !== ${expected.area}`)
  if (expected.contentPanel !== undefined) {
    assert(route.contentPanel === expected.contentPanel, `${hash}: contentPanel ${route.contentPanel} !== ${expected.contentPanel}`)
  }
  if (expected.promotionPanel !== undefined) {
    assert(route.promotionPanel === expected.promotionPanel, `${hash}: promotionPanel ${route.promotionPanel} !== ${expected.promotionPanel}`)
  }
  if (expected.brandPanel !== undefined) {
    assert(route.brandPanel === expected.brandPanel, `${hash}: brandPanel ${route.brandPanel} !== ${expected.brandPanel}`)
  }
}

export function runArtistWorkspaceRoutingTests() {
  expectRoute('', { area: 'overview' })
  expectRoute('#overview', { area: 'overview' })

  expectRoute('#content-songs', { area: 'content', contentPanel: 'songs' })
  expectRoute('#content-albums', { area: 'content', contentPanel: 'albums' })
  expectRoute('#content-media', { area: 'content', contentPanel: 'media' })
  expectRoute('#content-stories', { area: 'content', contentPanel: 'stories' })

  expectRoute('#songs', { area: 'content', contentPanel: 'songs' })
  expectRoute('#albums', { area: 'content', contentPanel: 'albums' })
  expectRoute('#media', { area: 'content', contentPanel: 'media' })
  expectRoute('#stories', { area: 'content', contentPanel: 'stories' })

  expectRoute('#promotion-campaigns', { area: 'promotion', promotionPanel: 'campaigns' })
  expectRoute('#promotion-playlists', { area: 'promotion', promotionPanel: 'playlists' })
  expectRoute('#campaigns', { area: 'promotion', promotionPanel: 'campaigns' })
  expectRoute('#playlists', { area: 'promotion', promotionPanel: 'playlists' })

  expectRoute('#growth', { area: 'growth' })

  expectRoute('#brand-public-site', { area: 'brand', brandPanel: 'sharing' })
  expectRoute('#brand-sharing', { area: 'brand', brandPanel: 'sharing' })
  expectRoute('#brand-epk', { area: 'brand', brandPanel: 'epk' })
  expectRoute('#brand-fanhub', { area: 'brand', brandPanel: 'fanhub' })
  expectRoute('#brand-analytics', { area: 'brand', brandPanel: 'analytics' })
  expectRoute('#epk', { area: 'brand', brandPanel: 'epk' })
  expectRoute('#fanhub', { area: 'brand', brandPanel: 'fanhub' })
  expectRoute('#public', { area: 'brand', brandPanel: 'sharing' })

  expectRoute('#settings', { area: 'settings' })

  expectRoute('#not-a-real-section', { area: 'overview' })

  assert(buildWorkspaceHash({ area: 'content', contentPanel: 'albums' }) === 'content-albums', 'build content-albums')
  assert(canonicalArtistWorkspaceHash('songs') === 'content-songs', 'canonical legacy songs')
  assert(canonicalArtistWorkspaceHash('brand-sharing') === 'brand-public-site', 'canonical brand sharing')
}

const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('artistWorkspaceTabs.test')

if (isMain) {
  runArtistWorkspaceRoutingTests()
  console.log('artistWorkspaceTabs: all routing tests passed')
}
