import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { extractSpotifyPlaylistId, normalizeSpotifyPlaylistUrl } from '@/lib/playlistCommunities/spotifyPlaylist'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const artistId = req.nextUrl.searchParams.get('artist_id')
  let query = sb.from('creator_playlists').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (artistId) query = query.eq('artist_id', artistId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ playlists: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const spotifyUrl = String(body.spotify_url || '').trim()
  const title = String(body.title || '').trim()
  if (!spotifyUrl && !title) {
    return NextResponse.json({ error: 'spotify_url_or_title_required' }, { status: 400 })
  }

  const spotifyPlaylistId = body.spotify_playlist_id
    ? String(body.spotify_playlist_id)
    : extractSpotifyPlaylistId(spotifyUrl)

  const row = {
    user_id: userId,
    artist_id: body.artist_id || null,
    spotify_playlist_id: spotifyPlaylistId,
    title: title || 'Untitled playlist',
    description: body.description || null,
    spotify_url: normalizeSpotifyPlaylistUrl(spotifyUrl || '', spotifyPlaylistId),
    image_url: body.image_url || null,
    owner_name: body.owner_name || null,
    genre: body.genre || null,
    mood: body.mood || null,
    visibility: ['private', 'public', 'unlisted'].includes(body.visibility) ? body.visibility : 'private',
  }

  const { data, error } = await sb.from('creator_playlists').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ playlist: data })
}
