import assert from 'node:assert/strict'
import {
  appendCanonicalTitleDirective,
  enforceCanonicalTitleInLyrics,
  canonicalTitleDirective,
} from './canonicalTitle'

assert.ok(canonicalTitleDirective('Burn The Chain').includes('Burn The Chain'))
assert.ok(appendCanonicalTitleDirective('Base system', 'Burn The Chain').includes('Do not change'))

const conflict = enforceCanonicalTitleInLyrics('# Burn The Chains\n\nVerse 1\nHello', 'Burn The Chain')
assert.equal(conflict.conflict, true)
assert.ok(conflict.text.startsWith('Burn The Chain'))

const ok = enforceCanonicalTitleInLyrics('Verse 1\nHello world', 'Burn The Chain')
assert.equal(ok.conflict, false)

console.log('songs/canonicalTitle.test.ts: all passed')
