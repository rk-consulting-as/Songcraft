import { NextRequest, NextResponse } from 'next/server'
import { spotifyFetch } from '@/lib/spotify'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { extractSpotifyPlaylistId, mapSpotifyPlaylist, normalizeSpotifyPlaylistUrl } from '@/lib/playlistCommunities/spotifyPlaylist'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: playlist } = await sb
    .from('creator_playlists')
    .select('id, spotify_url, spotify_playlist_id')
    .eq('id', params.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!playlist) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const pid = playlist.spotify_playlist_id || extractSpotifyPlaylistId(playlist.spotify_url || '')
  if (!pid) return NextResponse.json({ error: 'no_spotify_id' }, { status: 400 })

  try {
    const res = await spotifyFetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(pid)}?market=NO`
    )
    if (!res.ok) {
      return NextResponse.json({ error: 'spotify_fetch_failed' }, { status: 502 })
    }
    const meta = mapSpotifyPlaylist(await res.json())
    const { data: updated, error } = await sb
      .from('creator_playlists')
      .update({
        title: meta.title || playlist.spotify_url,
        description: meta.description,
        image_url: meta.imageUrl,
        owner_name: meta.ownerName,
        spotify_url: normalizeSpotifyPlaylistUrl(meta.spotifyUrl, pid),
        spotify_playlist_id: pid,
      })
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ playlist: updated })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'refresh_failed' },
      { status: 500 }
    )
  }
}
