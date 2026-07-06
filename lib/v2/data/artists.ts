import { createServerSupabase } from '@/lib/supabase/server'
import { V2_ARTISTS } from '@/lib/v2/mockData'
import { buildArtistNameLookup, mapArtistRow } from '@/lib/v2/mappers'
import { artistSlugCandidates } from '@/lib/v2/slug'
import type { V2Artist } from '@/lib/v2/types'

const ARTIST_SELECT = 'id, name, genre, description, avatar_url, spotify_image_url, social_links, page_slug, page_enabled, user_id'

async function songCountsByArtist(supabase: ReturnType<typeof createServerSupabase>, artistIds: string[]) {
  if (!artistIds.length) return {} as Record<string, number>
  const { data } = await supabase
    .from('songs')
    .select('artist_id')
    .in('artist_id', artistIds)

  const counts: Record<string, number> = {}
  for (const row of data || []) {
    counts[row.artist_id] = (counts[row.artist_id] || 0) + 1
  }
  return counts
}

export async function fetchCommunityArtists(): Promise<{ artists: V2Artist[]; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const queries = []
  if (user) {
    queries.push(
      supabase.from('artists').select(ARTIST_SELECT).eq('user_id', user.id).order('created_at', { ascending: true }),
    )
  }
  queries.push(
    supabase.from('artists').select(ARTIST_SELECT).eq('page_enabled', true).order('created_at', { ascending: false }).limit(24),
  )

  const results = await Promise.all(queries)
  const merged = new Map<string, Record<string, unknown>>()
  for (const res of results) {
    for (const row of res.data || []) {
      merged.set(row.id as string, row as Record<string, unknown>)
    }
  }

  const rows = Array.from(merged.values()) as Parameters<typeof mapArtistRow>[0][]
  if (!rows.length) {
    return { artists: V2_ARTISTS, fromMock: true }
  }

  const counts = await songCountsByArtist(supabase, rows.map(r => r.id))
  const artists = rows.map(row => mapArtistRow(row, { songCount: counts[row.id] || 0 }))
  return { artists, fromMock: false }
}

export async function fetchCommunityArtistBySlug(slug: string): Promise<{ artist: V2Artist | null; fromMock: boolean }> {
  const { pageSlug, idPrefix } = artistSlugCandidates(slug)
  const supabase = createServerSupabase()

  let row: Record<string, unknown> | null = null

  if (pageSlug) {
    const { data } = await supabase.from('artists').select(ARTIST_SELECT).eq('page_slug', pageSlug).maybeSingle()
    if (data) row = data as Record<string, unknown>
  }

  if (!row && idPrefix) {
    const { data: candidates } = await supabase.from('artists').select(ARTIST_SELECT).ilike('id', `${idPrefix}%`).limit(5)
    const match = (candidates || []).find(c => c.id.startsWith(idPrefix))
    if (match) row = match as Record<string, unknown>
  }

  if (!row) {
    const mock = V2_ARTISTS.find(a => a.slug === slug)
    return { artist: mock || null, fromMock: !!mock }
  }

  const counts = await songCountsByArtist(supabase, [row.id as string])
  return {
    artist: mapArtistRow(row as Parameters<typeof mapArtistRow>[0], { songCount: counts[row.id as string] || 0 }),
    fromMock: false,
  }
}

export async function fetchArtistRowsForSongs(artistIds: string[]) {
  if (!artistIds.length) return buildArtistNameLookup([])
  const supabase = createServerSupabase()
  const { data } = await supabase.from('artists').select('id, name, page_slug').in('id', Array.from(new Set(artistIds)))
  return buildArtistNameLookup((data || []) as Parameters<typeof buildArtistNameLookup>[0])
}
