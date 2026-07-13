import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { buildSongMatchContext, calculateCuratorMatch, roomDnaFromMeta } from '@/lib/v2/curatorMatching'
import { buildPlaylistRoomSubmissionAdded } from '@/lib/v2/communityNotifications'
import { createManyCommunityNotifications } from '@/lib/v2/data/communityNotifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveRoom(slug: string) {
  const sb = v2ServiceClient()
  return sb.from('v2_playlist_rooms').select('id, slug, name, circle_id, owner_user_id, room_meta, submission_open').eq('slug', slug).maybeSingle()
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const songId = typeof body.song_id === 'string' ? body.song_id : ''
  if (!songId) return NextResponse.json({ error: 'song_id_required' }, { status: 400 })

  const { data: room } = await resolveRoom(params.slug)
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (room.submission_open === false) return NextResponse.json({ error: 'submissions_closed' }, { status: 403 })

  const pitch = typeof body.pitch === 'string' ? body.pitch.trim().slice(0, 500) : ''

  const { data: song } = await sb
    .from('songs')
    .select('id, title, user_id, creation_type, lyrics_instructions, publish_content, song_dna, artists(name), spotify_url, media_links')
    .eq('id', songId)
    .maybeSingle()
  if (!song || song.user_id !== userId) return NextResponse.json({ error: 'song_not_owned' }, { status: 403 })

  const artistRow = (song as { artists?: { name: string } | { name: string }[] | null }).artists
  const artistName = Array.isArray(artistRow) ? artistRow[0]?.name : artistRow?.name
  const externalUrl = (song as { spotify_url?: string }).spotify_url || null

  const roomDna = roomDnaFromMeta((room.room_meta as Record<string, unknown>) || {})
  const matchContext = buildSongMatchContext({
    title: song.title as string,
    artistName: artistName || 'Artist',
    pitch: pitch || null,
    songDna: (song as { song_dna?: unknown }).song_dna,
    creationType: (song as { creation_type?: string }).creation_type,
    lyricsInstructions: (song as { lyrics_instructions?: string }).lyrics_instructions,
    publishContent: (song as { publish_content?: unknown }).publish_content,
  })
  const aiMatch = calculateCuratorMatch(roomDna, matchContext)

  const { count } = await sb
    .from('v2_playlist_room_items')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id)

  const { data, error } = await sb
    .from('v2_playlist_room_items')
    .insert({
      room_id: room.id,
      song_id: songId,
      position: (count || 0) + 1,
      title: song.title,
      artist_name: artistName || 'Artist',
      external_url: externalUrl,
      submitted_by: userId,
      status: 'pending',
      pitch: pitch || null,
      song_dna_snapshot: (song as { song_dna?: unknown }).song_dna || null,
      ai_match: aiMatch,
    })
    .select('id, position')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb.from('v2_playlist_rooms').update({ track_count: (count || 0) + 1 }).eq('id', room.id)

  if (room.owner_user_id) {
    await createManyCommunityNotifications(sb, [
      {
        userId: room.owner_user_id,
        kind: 'host_submission_pending',
        title: `New submission for “${room.name}”.`,
        body: `“${song.title}” is waiting for curator review.`,
        ctaLabel: 'Open Curator Workspace',
        ctaHref: `/community/playlists/${room.slug}`,
        entityType: 'playlist_room',
        entityId: room.id,
        metadata: { songTitle: song.title },
      },
      buildPlaylistRoomSubmissionAdded({
        userId,
        roomSlug: room.slug,
        roomName: room.name,
        songTitle: song.title as string,
      }),
    ])
  }

  return NextResponse.json({ item: data, ai_match: aiMatch })
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const sb = v2ServiceClient()
  const { data: room } = await resolveRoom(params.slug)
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: items } = await sb
    .from('v2_playlist_room_items')
    .select('id, song_id, title, artist_name, position, external_url, submitted_by, created_at')
    .eq('room_id', room.id)
    .order('position', { ascending: true })

  return NextResponse.json({ queue: items || [] })
}
