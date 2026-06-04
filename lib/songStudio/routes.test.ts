/**
 * Song Studio hash routing tests — run: npm run test:song-studio-routing
 */
import {
  buildSongStudioHash,
  canonicalSongStudioHash,
  getActivePanel,
  parseSongStudioHash,
  type SongStudioRoute,
} from './routes'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function expectRoute(hash: string, expected: SongStudioRoute) {
  const route = parseSongStudioHash(hash)
  assert(route.area === expected.area, `${hash}: area ${route.area} !== ${expected.area}`)
  if (expected.writePanel !== undefined) {
    assert(route.writePanel === expected.writePanel, `${hash}: writePanel mismatch`)
  }
  if (expected.producePanel !== undefined) {
    assert(route.producePanel === expected.producePanel, `${hash}: producePanel mismatch`)
  }
  if (expected.promotePanel !== undefined) {
    assert(route.promotePanel === expected.promotePanel, `${hash}: promotePanel mismatch`)
  }
  if (expected.releasePanel !== undefined) {
    assert(route.releasePanel === expected.releasePanel, `${hash}: releasePanel mismatch`)
  }
  if (expected.publishPanel !== undefined) {
    assert(route.publishPanel === expected.publishPanel, `${hash}: publishPanel mismatch`)
  }
}

export function runSongStudioRoutingTests() {
  expectRoute('', { area: 'overview' })
  expectRoute('#overview', { area: 'overview' })

  expectRoute('#write-lyrics', { area: 'write', writePanel: 'lyrics' })
  expectRoute('#write-backstory', { area: 'write', writePanel: 'backstory' })
  expectRoute('#write-dna', { area: 'write', writePanel: 'dna' })
  expectRoute('#lyrics', { area: 'write', writePanel: 'lyrics' })
  expectRoute('#backstory', { area: 'write', writePanel: 'backstory' })
  expectRoute('#dna', { area: 'write', writePanel: 'dna' })

  expectRoute('#produce-suno', { area: 'produce', producePanel: 'suno' })
  expectRoute('#produce-cover', { area: 'produce', producePanel: 'cover' })
  expectRoute('#produce-canvas', { area: 'produce', producePanel: 'canvas' })
  expectRoute('#suno', { area: 'produce', producePanel: 'suno' })
  expectRoute('#cover', { area: 'produce', producePanel: 'cover' })
  expectRoute('#canvas', { area: 'produce', producePanel: 'canvas' })

  expectRoute('#promote-captions', { area: 'promote', promotePanel: 'captions' })
  expectRoute('#promote-assets', { area: 'promote', promotePanel: 'assets' })
  expectRoute('#captions', { area: 'promote', promotePanel: 'captions' })

  expectRoute('#release-campaign', { area: 'release', releasePanel: 'campaign' })
  expectRoute('#release-distribution', { area: 'release', releasePanel: 'distribution' })
  expectRoute('#campaign', { area: 'release', releasePanel: 'campaign' })
  expectRoute('#distribution', { area: 'release', releasePanel: 'distribution' })

  expectRoute('#publish-media', { area: 'publish', publishPanel: 'media' })
  expectRoute('#publish-share', { area: 'publish', publishPanel: 'publish' })
  expectRoute('#media', { area: 'publish', publishPanel: 'media' })
  expectRoute('#publish', { area: 'publish', publishPanel: 'publish' })

  expectRoute('#settings-metadata', { area: 'settings' })
  expectRoute('#settings', { area: 'settings' })

  expectRoute('#unknown-panel', { area: 'overview' })

  assert(getActivePanel(parseSongStudioHash('#write-lyrics')) === 'lyrics', 'active panel lyrics')
  assert(getActivePanel(parseSongStudioHash('#promote-assets')) === 'promote-assets', 'active panel assets')
  assert(buildSongStudioHash({ area: 'write', writePanel: 'backstory' }) === 'write-backstory', 'build backstory')
  assert(canonicalSongStudioHash('lyrics') === 'write-lyrics', 'canonical legacy lyrics')
  assert(canonicalSongStudioHash('publish') === 'publish-share', 'canonical legacy publish')
}

const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('songStudio/routes.test')

if (isMain) {
  runSongStudioRoutingTests()
  console.log('songStudio/routes: all routing tests passed')
}
