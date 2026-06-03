import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fetchEpkSelectedSongs } from '@/lib/epkSongs'
import { getUserPlan } from '@/lib/subscription'

export type EpkPageData = {
  artist: Record<string, unknown>
  epk: Record<string, unknown>
  songs: Awaited<ReturnType<typeof fetchEpkSelectedSongs>>['songs']
  mode: 'public' | 'preview'
}

function anonClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

async function userHasPro(userId: string): Promise<boolean> {
  const service = serviceClient()
  if (!service) return false
  const plan = await getUserPlan(service, userId)
  return plan.id === 'pro'
}

function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).trim()
  } catch {
    return slug.trim()
  }
}

async function loadEpkSongs(
  sb: SupabaseClient,
  artist: { id: string; user_id: string },
  epk: Record<string, unknown>,
  publicOnly: boolean,
) {
  const selectedIds = Array.isArray(epk.selected_song_ids) ? (epk.selected_song_ids as string[]) : []
  const { songs } = await fetchEpkSelectedSongs(sb, {
    artistId: artist.id,
    userId: artist.user_id,
    selectedIds,
    publicOnly,
    fallbackLimit: 4,
  })
  return songs
}

/** Published EPK at /epk/[page_slug] — requires page_enabled, epk.public_enabled, and Pro. */
export async function fetchPublishedEpk(slug: string): Promise<EpkPageData | null> {
  const normalized = normalizeSlug(slug)
  const sb = anonClient()
  const { data: artist } = await sb
    .from('artists')
    .select('*')
    .eq('page_slug', normalized)
    .eq('page_enabled', true)
    .eq('admin_hidden', false)
    .maybeSingle()

  if (!artist?.page_slug) return null

  const epk = (artist.page_settings as { epk?: Record<string, unknown> } | null)?.epk
  if (!epk?.public_enabled) return null
  if (!(await userHasPro(artist.user_id))) return null

  const songs = await loadEpkSongs(sb, artist, epk, true)
  return { artist, epk, songs, mode: 'public' }
}

/** Draft preview at /epk/[page_slug]?preview=1 — owner workspace; relaxed publish gates. */
export async function fetchPreviewEpk(slug: string): Promise<EpkPageData | null> {
  const normalized = normalizeSlug(slug)
  const service = serviceClient()
  const sb = service || anonClient()

  let artist: Record<string, unknown> | null = null

  if (service) {
    const { data } = await service
      .from('artists')
      .select('*')
      .eq('page_slug', normalized)
      .maybeSingle()
    artist = data
  }

  if (!artist) {
    const { data } = await sb
      .from('artists')
      .select('*')
      .eq('page_slug', normalized)
      .eq('page_enabled', true)
      .eq('admin_hidden', false)
      .maybeSingle()
    artist = data
  }

  if (!artist?.page_slug) return null

  const settings = (artist.page_settings || {}) as { epk?: Record<string, unknown> }
  const epk = settings.epk || {}

  const songs = await loadEpkSongs(sb, artist as { id: string; user_id: string }, epk, false)
  return { artist, epk, songs, mode: 'preview' }
}

export async function fetchEpkPage(slug: string, preview: boolean): Promise<EpkPageData | null> {
  if (preview) return fetchPreviewEpk(slug)
  return fetchPublishedEpk(slug)
}
