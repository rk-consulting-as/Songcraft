import type { SupabaseClient } from '@supabase/supabase-js'
import { storySlugLookupVariants } from './slug'
import { publicStoriesNowIso } from './visibility'

const LIVE_STATUSES = ['published', 'scheduled'] as const

export function queryLiveArtistStoriesList(sb: SupabaseClient, artistId: string, now: Date = new Date()) {
  return sb
    .from('artist_stories')
    .select('id, title, slug, excerpt, cover_image_url, story_type, published_at, body')
    .eq('artist_id', artistId)
    .in('status', [...LIVE_STATUSES])
    .lte('published_at', publicStoriesNowIso(now))
    .not('published_at', 'is', null)
    .eq('public_hidden', false)
    .eq('admin_hidden', false)
}

export function queryLiveArtistStoryBySlug(
  sb: SupabaseClient,
  artistId: string,
  storySlug: string,
  now: Date = new Date(),
) {
  const slugVariants = storySlugLookupVariants(storySlug)
  return sb
    .from('artist_stories')
    .select('*')
    .eq('artist_id', artistId)
    .in('slug', slugVariants)
    .in('status', [...LIVE_STATUSES])
    .lte('published_at', publicStoriesNowIso(now))
    .not('published_at', 'is', null)
    .eq('public_hidden', false)
    .eq('admin_hidden', false)
    .maybeSingle()
}

export function queryLiveArtistStoriesRelated(
  sb: SupabaseClient,
  artistId: string,
  excludeId: string,
  now: Date = new Date(),
) {
  return sb
    .from('artist_stories')
    .select('id, title, slug, excerpt, cover_image_url, story_type, song_id, published_at')
    .eq('artist_id', artistId)
    .neq('id', excludeId)
    .in('status', [...LIVE_STATUSES])
    .lte('published_at', publicStoriesNowIso(now))
    .not('published_at', 'is', null)
    .eq('public_hidden', false)
    .eq('admin_hidden', false)
    .order('published_at', { ascending: false })
    .limit(24)
}
