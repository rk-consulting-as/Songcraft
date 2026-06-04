import assert from 'node:assert/strict'
import {
  getStoryPublicUrl,
  getStoryShareCopyUrl,
  getStoryShareState,
  isStoryLive,
} from './publicUrl'
import { normalizeStorySlug, storySlugLookupVariants } from './slug'

const artist = { page_slug: 'my-artist', page_enabled: true, admin_hidden: false }
const artistPrivate = { page_slug: 'my-artist', page_enabled: false, admin_hidden: false }

function draftStory(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'my-story',
    status: 'draft',
    published_at: null,
    public_hidden: false,
    admin_hidden: false,
    ...overrides,
  }
}

assert.equal(getStoryShareState(draftStory(), artist), 'draft')
assert.equal(getStoryShareCopyUrl(draftStory(), { ...artist, id: 'a1' }).state, 'draft')
assert.ok(getStoryShareCopyUrl(draftStory(), { ...artist, id: 'a1' }).url.includes('/artist/a1'))

assert.equal(
  getStoryShareState(
    { slug: 'future', status: 'scheduled', published_at: '2099-06-01T12:00:00.000Z', public_hidden: false, admin_hidden: false },
    artist,
  ),
  'scheduled',
)

assert.equal(
  getStoryShareState(
    { slug: 'hidden', status: 'published', published_at: '2020-01-01T00:00:00.000Z', public_hidden: true, admin_hidden: false },
    artist,
  ),
  'hidden',
)

assert.equal(getStoryShareState(draftStory(), artistPrivate), 'artist_not_public')
assert.equal(getStoryShareState(draftStory({ slug: '' }), artist), 'missing_slug')

const liveStory = {
  slug: 'live_story',
  status: 'published',
  published_at: '2020-01-01T00:00:00.000Z',
  public_hidden: false,
  admin_hidden: false,
}
assert.equal(getStoryShareState(liveStory, artist), 'live')
assert.ok(isStoryLive(liveStory, artist))
assert.match(getStoryPublicUrl(liveStory, artist), /\/p\/my-artist\/stories\/live-story$/)

assert.deepEqual(storySlugLookupVariants('behind_the_song'), ['behind-the-song', 'behind_the_song'])
assert.equal(normalizeStorySlug('My_Story Title'), 'my-story-title')

console.log('artistStories/publicUrl.test.ts: all passed')
