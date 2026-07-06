import { createServerSupabase } from '@/lib/supabase/server'
import { fetchArtistRowsForSongs } from '@/lib/v2/data/artists'
import { V2_SONGS, getSongById as getMockSongById } from '@/lib/v2/mockData'
import { mapSongRow } from '@/lib/v2/mappers'
import type { V2Song } from '@/lib/v2/types'

const SONG_SELECT = 'id, artist_id, title, status, lyrics_instructions, cover_image_url, spotify_cover_url, spotify_url, media_links, publish_content, user_id'

export async function fetchCommunitySongs(): Promise<{ songs: V2Song[]; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase.from('songs').select(SONG_SELECT).order('created_at', { ascending: false }).limit(48)
  if (user) {
    query = query.eq('user_id', user.id)
  }

  const { data: rows } = await query
  if (!rows?.length) {
    if (user) {
      const { data: publicRows } = await supabase
        .from('songs')
        .select(SONG_SELECT)
        .order('created_at', { ascending: false })
        .limit(24)
      if (publicRows?.length) {
        const lookup = await fetchArtistRowsForSongs(publicRows.map(r => r.artist_id))
        return {
          songs: publicRows.map(r => mapSongRow(r, lookup[r.artist_id])),
          fromMock: false,
        }
      }
    }
    return { songs: V2_SONGS, fromMock: true }
  }

  const lookup = await fetchArtistRowsForSongs(rows.map(r => r.artist_id))
  return {
    songs: rows.map(r => mapSongRow(r, lookup[r.artist_id])),
    fromMock: false,
  }
}

export async function fetchCommunitySongById(id: string): Promise<{ song: V2Song | null; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data: row } = await supabase.from('songs').select(SONG_SELECT).eq('id', id).maybeSingle()

  if (!row) {
    const mock = getMockSongById(id)
    return { song: mock || null, fromMock: !!mock }
  }

  const lookup = await fetchArtistRowsForSongs([row.artist_id])
  return { song: mapSongRow(row, lookup[row.artist_id]), fromMock: false }
}

export async function fetchSongsForArtistId(artistId: string): Promise<V2Song[]> {
  const supabase = createServerSupabase()
  const { data: rows } = await supabase
    .from('songs')
    .select(SONG_SELECT)
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })

  if (!rows?.length) return []
  const lookup = await fetchArtistRowsForSongs([artistId])
  return rows.map(r => mapSongRow(r, lookup[r.artist_id]))
}
