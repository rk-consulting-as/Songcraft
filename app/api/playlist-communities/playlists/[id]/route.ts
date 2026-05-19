import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { extractSpotifyPlaylistId, normalizeSpotifyPlaylistUrl } from '@/lib/playlistCommunities/spotifyPlaylist'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PATCH_FIELDS = [
  'title', 'description', 'spotify_url', 'image_url', 'owner_name', 'genre', 'mood', 'visibility', 'artist_id',
] as const

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  for (const key of PATCH_FIELDS) {
    if (body[key] !== undefined) patch[key] = body[key]
  }
  if (body.spotify_url) {
    const id = extractSpotifyPlaylistId(String(body.spotify_url))
    if (id) {
      patch.spotify_playlist_id = id
      patch.spotify_url = normalizeSpotifyPlaylistUrl(String(body.spotify_url), id)
    }
  }
  if (body.archive === true) patch.archived_at = new Date().toISOString()
  if (body.unarchive === true) patch.archived_at = null

  const { data, error } = await sb
    .from('creator_playlists')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ playlist: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: pl } = await sb
    .from('creator_playlists')
    .select('archived_at')
    .eq('id', params.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!pl) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!pl.archived_at) {
    return NextResponse.json({ error: 'archive_before_delete' }, { status: 400 })
  }

  const { count } = await sb
    .from('playlist_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('playlist_id', params.id)
    .neq('status', 'archived')

  if ((count || 0) > 0) {
    return NextResponse.json({ error: 'has_active_campaigns' }, { status: 400 })
  }

  const { error } = await sb.from('creator_playlists').delete().eq('id', params.id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
