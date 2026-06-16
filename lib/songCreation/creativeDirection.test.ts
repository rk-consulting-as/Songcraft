import assert from 'node:assert/strict'
import {
  alignSunoPromptToDirection,
  buildCreativeDirectionPayload,
  buildExternalInspirationContext,
  parseCreativeDirection,
  sanitizeExternalReferences,
} from './creativeDirection'

assert.deepEqual(sanitizeExternalReferences('Tool, Evanescence\nVolbeat'), ['Tool', 'Evanescence', 'Volbeat'])

const direction = buildCreativeDirectionPayload({
  artistProfileUsed: true,
  productionDnaUsed: true,
  internalReferenceSongIds: ['a1'],
  internalReferenceSongTitles: ['Prior Song'],
  externalArtists: ['Tool'],
  externalSongs: ['Schism by Tool'],
  inspirationTraits: ['structure', 'atmosphere', 'rhythm_groove'],
  userDirection: 'Dark progressive tension without copying.',
  originalPrompt: 'A philosophical metal song',
  generatedConceptSummary: 'Slow-building dark progressive rock with odd-meter tension.',
})

const external = buildExternalInspirationContext(direction)
assert.ok(external.includes('Tool'))
assert.ok(external.includes('Schism'))
assert.ok(!external.toLowerCase().includes('sound like'))

const aligned = alignSunoPromptToDirection('Progressive dark rock, gritty vocal.', direction, 1000)
assert.ok(aligned.length <= 1000)
assert.ok(/original song/i.test(aligned))

const parsed = parseCreativeDirection({ creative_direction: direction })
assert.equal(parsed?.external_reference_artists?.[0], 'Tool')

console.log('songCreation/creativeDirection.test.ts: all passed')
