import assert from 'node:assert/strict'
import { extractSpotifyPlaylistId, normalizeSpotifyPlaylistUrl } from '@/lib/playlistCommunities/spotifyPlaylist'
import { verifyOAuthState, signOAuthState } from '@/lib/spotify/tokenCrypto'
import { diffPlaylistSnapshots, summarizePlaylistDiff } from '@/lib/playback/providers/spotify/playlistDiff'
import {
  matchRecentlyPlayedToSnapshot,
  scoreSpotifyMatchCoverage,
} from '@/lib/playback/providers/spotify/matchTracks'
import { detectQueueAmbiguity, matchRecentlyPlayedToQueue } from '@/lib/playback/providers/spotify/queueMatch'
import type { PlaylistSnapshot } from '@/lib/playback/types'

// OAuth state
const payload = Buffer.from(JSON.stringify({ u: 'user-1', r: '/community', t: Date.now() })).toString('base64url')
const state = signOAuthState(payload)
const verified = verifyOAuthState(state)
assert.equal(verified.valid, true)
assert.equal(verifyOAuthState('bad').valid, false)

// Playlist URL parsing
assert.equal(extractSpotifyPlaylistId('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'), '37i9dQZF1DXcBWIGoYBM5M')
assert.equal(extractSpotifyPlaylistId('spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'), '37i9dQZF1DXcBWIGoYBM5M')
assert.ok(normalizeSpotifyPlaylistUrl('', '37i9dQZF1DXcBWIGoYBM5M').includes('open.spotify.com'))

// Snapshot diff immutability concept — previous unchanged, new has added track
const prev: PlaylistSnapshot = {
  id: 'snap-1',
  platform: 'spotify',
  name: 'Test',
  trackCount: 1,
  totalDurationSeconds: 200,
  tracks: [{ position: 1, externalTrackId: 't1', title: 'Song A', artistName: 'Artist' }],
  createdAt: new Date().toISOString(),
  snapshotAt: new Date().toISOString(),
}
const next: PlaylistSnapshot = {
  ...prev,
  id: 'snap-2',
  trackCount: 2,
  tracks: [
    ...prev.tracks,
    { position: 2, externalTrackId: 't2', title: 'Song B', artistName: 'Artist' },
  ],
}
const diff = diffPlaylistSnapshots(prev, next)
assert.equal(diff.added.length, 1)
assert.equal(diff.removed.length, 0)
assert.ok(summarizePlaylistDiff(diff).includes('1 added'))

// Exact track ID match
const recent = [{
  playedAt: new Date().toISOString(),
  trackId: 't1',
  trackUri: 'spotify:track:t1',
  title: 'Song A',
  artist: 'Artist',
}]
const matches = matchRecentlyPlayedToSnapshot(prev.tracks, recent, {
  start: new Date(Date.now() - 3600000).toISOString(),
  end: new Date().toISOString(),
})
assert.equal(matches.length, 1)
assert.equal(matches[0].matchType, 'spotify_id')

// ISRC match
const isrcRecent = [{ ...recent[0], trackId: 'other', isrc: 'USRC1' }]
const isrcSnap = [{ position: 1, isrc: 'USRC1', title: 'Song A', artistName: 'Artist' }]
const isrcMatches = matchRecentlyPlayedToSnapshot(isrcSnap, isrcRecent)
assert.equal(isrcMatches[0].matchType, 'isrc')

// Coverage scoring
const cov = scoreSpotifyMatchCoverage(10, matches)
assert.ok(['low', 'medium', 'high', 'unknown'].includes(cov.confidence))

// Queue ambiguity
const buckets = matchRecentlyPlayedToQueue(
  [{
    snapshotId: 'a',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    endedAt: new Date().toISOString(),
    tracks: prev.tracks,
  }],
  recent,
)
assert.equal(buckets[0].matches.length, 1)
assert.equal(detectQueueAmbiguity(buckets).length, 0)

console.log('lib/spotify/spotifyPhase6c.test.ts: all passed')
