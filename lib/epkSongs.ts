import type { SupabaseClient } from '@supabase/supabase-js'

export const EPK_SONG_FIELDS =
  'id, title, status, backstory, lyrics_instructions, publish_content, spotify_url, suno_url, media_links, cover_image_url, spotify_cover_url, spotify_release_date, artist_id, user_id, public_hidden'

export type EpkSong = {
  id: string
  title: string
  status?: string | null
  backstory?: string | null
  lyrics_instructions?: string | null
  publish_content?: Record<string, unknown> | null
  spotify_url?: string | null
  suno_url?: string | null
  media_links?: unknown
  cover_image_url?: string | null
  spotify_cover_url?: string | null
  spotify_release_date?: string | null
  artist_id?: string
  user_id?: string
  public_hidden?: boolean | null
}

function stripMarkup(value: unknown): string {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#*_`>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getEpkSongCover(song: EpkSong): string | null {
  return song.cover_image_url || song.spotify_cover_url || null
}

export function getEpkSongBlurb(song: EpkSong, maxLen = 180): string {
  const publish = song.publish_content
  let fromPublish = ''
  if (publish && typeof publish === 'object') {
    fromPublish = stripMarkup(
      (publish as Record<string, unknown>).press_blurb ||
        (publish as Record<string, unknown>).description ||
        (publish as Record<string, unknown>).caption ||
        ''
    )
  }
  const text =
    stripMarkup(song.backstory) ||
    fromPublish ||
    stripMarkup(song.lyrics_instructions)
  if (!text) return ''
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1).replace(/\s+\S*$/, '')}…`
}

/** Preserve editor/public selection order using stable song IDs. */
export function orderEpkSongsByIds(songs: EpkSong[], selectedIds: string[]): EpkSong[] {
  if (!selectedIds.length) return songs
  const byId = new Map(songs.map(song => [song.id, song]))
  return selectedIds
    .map(id => byId.get(id))
    .filter((song): song is EpkSong => !!song)
}

/** Client/editor: resolve selected songs from loaded catalog. */
export function resolveEpkSongsFromCatalog(
  catalog: EpkSong[],
  selectedIds: string[],
  fallbackLimit = 4
): { songs: EpkSong[]; missingIds: string[] } {
  if (!selectedIds.length) {
    return { songs: catalog.slice(0, fallbackLimit), missingIds: [] }
  }
  const matching = catalog.filter(song => selectedIds.includes(song.id))
  const songs = orderEpkSongsByIds(matching, selectedIds)
  const missingIds = selectedIds.filter(id => !matching.some(song => song.id === id))
  return { songs, missingIds }
}

export async function fetchEpkSelectedSongs(
  sb: SupabaseClient,
  opts: {
    artistId: string
    userId: string
    selectedIds: string[]
    publicOnly?: boolean
    fallbackLimit?: number
  }
): Promise<{ songs: EpkSong[]; missingIds: string[] }> {
  const { artistId, userId, selectedIds, publicOnly = true, fallbackLimit = 4 } = opts

  let query = sb
    .from('songs')
    .select(EPK_SONG_FIELDS)
    .eq('artist_id', artistId)
    .eq('user_id', userId)

  if (publicOnly) query = query.eq('public_hidden', false)

  if (selectedIds.length > 0) {
    const { data, error } = await query.in('id', selectedIds)
    if (error) console.error('[epkSongs] selected fetch error:', error.message)
    const rows = (data || []) as EpkSong[]
    const songs = orderEpkSongsByIds(rows, selectedIds)
    const missingIds = selectedIds.filter(id => !rows.some(row => row.id === id))
    return { songs, missingIds }
  }

  const { data, error } = await query
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(fallbackLimit)

  if (error) console.error('[epkSongs] fallback fetch error:', error.message)
  return { songs: (data || []) as EpkSong[], missingIds: [] }
}
