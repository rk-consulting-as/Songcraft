import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { mapLinkedPlaylistRow, parsePlaylistUrl } from '@/lib/v2/data/curatorRooms'
import { createPlaybackEngine } from '@/lib/playback/PlaybackEngine'
import { syncCuratorLinkedSpotifyPlaylist } from '@/lib/spotify/playlistSync'
import { trackSpotifyEvent } from '@/lib/spotify/analytics'
import type { PlaylistSnapshotTrack } from '@/lib/playback/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveRoom(slug: string) {
  const sb = v2ServiceClient()
  return sb.from('v2_playlist_rooms').select('id, slug, owner_user_id, name').eq('slug', slug).maybeSingle()
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const sb = v2ServiceClient()
  const { data: room } = await resolveRoom(params.slug)
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data } = await sb
    .from('v2_curator_linked_playlists')
    .select('*')
    .eq('room_id', room.id)
    .order('position', { ascending: true })

  return NextResponse.json({ playlists: (data || []).map(r => mapLinkedPlaylistRow(r as Record<string, unknown>)) })
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: room } = await resolveRoom(params.slug)
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (room.owner_user_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const playlistUrl = typeof body.playlist_url === 'string' ? body.playlist_url.trim() : ''
  if (!playlistUrl) return NextResponse.json({ error: 'playlist_url_required' }, { status: 400 })

  const platform = ['spotify', 'youtube', 'apple', 'mixed', 'other'].includes(body.platform)
    ? body.platform
    : 'mixed'

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const coverImageUrl = typeof body.cover_image_url === 'string' ? body.cover_image_url.trim() : ''
  const curatorName = typeof body.curator_name === 'string' ? body.curator_name.trim() : ''
  const trackCount = typeof body.track_count === 'number' ? body.track_count : 0
  const totalDurationSeconds = typeof body.total_duration_seconds === 'number' ? body.total_duration_seconds : 0

  const parsed = parsePlaylistUrl(platform, playlistUrl)
  const hasManualMeta = !!(title || trackCount)
  const wantsSpotifySync = !!body.spotify_sync && platform === 'spotify'
  const syncStatus = wantsSpotifySync ? 'connected' : hasManualMeta ? 'manual' : 'needs_configuration'

  const { count } = await sb
    .from('v2_curator_linked_playlists')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id)

  const { data: linked, error } = await sb
    .from('v2_curator_linked_playlists')
    .insert({
      room_id: room.id,
      platform,
      playlist_url: playlistUrl,
      external_playlist_id: parsed.externalId || null,
      title: title || parsed.title || null,
      description: description || null,
      cover_image_url: coverImageUrl || null,
      curator_name: curatorName || null,
      sync_status: syncStatus,
      track_count: trackCount,
      total_duration_seconds: totalDurationSeconds,
      position: (count || 0) + 1,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await trackSpotifyEvent(sb, userId, 'spotify_playlist_linked', {
    room_id: room.id,
    linked_playlist_id: linked.id,
    platform,
  })

  let snapshot = null
  if (body.create_snapshot && title) {
    const engine = createPlaybackEngine(sb)
    const tracks = Array.isArray(body.tracks) ? body.tracks as PlaylistSnapshotTrack[] : []
    snapshot = await engine.linkPlaylistSnapshot({
      platform: platform === 'other' ? 'mixed' : platform,
      externalPlaylistId: parsed.externalId,
      name: title || room.name,
      description,
      coverImageUrl: coverImageUrl || undefined,
      ownerUserId: userId,
      tracks,
      linkedContextType: 'v2_playlist_room',
      linkedContextId: room.id,
    })
    await sb.from('v2_curator_linked_playlists').update({
      latest_snapshot_id: snapshot.id,
      sync_status: 'manual',
      last_synced_at: new Date().toISOString(),
    }).eq('id', linked.id)
    await sb.from('v2_playlist_rooms').update({ current_snapshot_id: snapshot.id }).eq('id', room.id)
  }

  if (wantsSpotifySync) {
    try {
      const synced = await syncCuratorLinkedSpotifyPlaylist(v2ServiceClient(), userId, String(linked.id))
      snapshot = { id: synced.snapshotId }
      await trackSpotifyEvent(sb, userId, 'spotify_playlist_synced', { linked_playlist_id: linked.id })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'sync_failed'
      await trackSpotifyEvent(sb, userId, 'spotify_playlist_sync_failed', { error: msg })
    }
  }

  const { data: fresh } = await sb.from('v2_curator_linked_playlists').select('*').eq('id', linked.id).single()

  return NextResponse.json({
    playlist: mapLinkedPlaylistRow((fresh || linked) as Record<string, unknown>),
    snapshot,
    message: syncStatus === 'needs_configuration'
      ? 'Playlist linked. Add manual metadata or wait for platform sync configuration.'
      : 'Playlist linked with manual metadata.',
  })
}
