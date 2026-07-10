import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { canManagePlaylistRoomHost } from '@/lib/v2/hostAccess'
import { createManyCommunityNotifications } from '@/lib/v2/data/communityNotifications'
import { buildPlaylistRoomRoundCompleted } from '@/lib/v2/communityNotifications'
import { notifySavedPlaylistRoundCompleted } from '@/lib/v2/data/followNotifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveRoom(slug: string) {
  const sb = v2ServiceClient()
  return sb.from('v2_playlist_rooms').select('id, owner_user_id, slug, name').eq('slug', slug).maybeSingle()
}

async function notifyRoundCompleted(roomId: string, roomSlug: string, roomName: string, hostUserId: string) {
  const service = v2ServiceClient()
  const [{ data: participants }, { data: items }] = await Promise.all([
    service.from('v2_playlist_room_participation').select('user_id').eq('room_id', roomId),
    service.from('v2_playlist_room_items').select('submitted_by').eq('room_id', roomId),
  ])

  const userIds = new Set<string>()
  for (const p of participants || []) if (p.user_id) userIds.add(p.user_id as string)
  for (const i of items || []) if (i.submitted_by) userIds.add(i.submitted_by as string)
  userIds.delete(hostUserId)

  await createManyCommunityNotifications(
    service,
    Array.from(userIds).map(uid => buildPlaylistRoomRoundCompleted({ userId: uid, roomSlug, roomName })),
  )
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: room } = await resolveRoom(params.slug)
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const canHost = await canManagePlaylistRoomHost(sb, userId, room.owner_user_id)
  if (!canHost) return NextResponse.json({ error: 'host_only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : ''

  if (action === 'complete_round') {
    const now = new Date().toISOString()
    await sb.from('v2_playlist_rooms').update({
      round_status: 'completed',
      last_completed_at: now,
    }).eq('id', room.id)
    await notifyRoundCompleted(room.id, room.slug, room.name as string, room.owner_user_id as string)
    await notifySavedPlaylistRoundCompleted({
      roomId: room.id as string,
      roomSlug: room.slug as string,
      roomName: room.name as string,
      hostUserId: room.owner_user_id as string,
    })
    return NextResponse.json({ ok: true, round_status: 'completed' })
  }

  if (action === 'start_round') {
    await sb.from('v2_playlist_rooms').update({ round_status: 'active', last_completed_at: null }).eq('id', room.id)
    return NextResponse.json({ ok: true, round_status: 'active' })
  }

  if (action === 'mark_played') {
    const itemId = typeof body.item_id === 'string' ? body.item_id : ''
    if (!itemId) return NextResponse.json({ error: 'item_id_required' }, { status: 400 })
    await sb.from('v2_playlist_room_items').update({ played_at: new Date().toISOString() }).eq('id', itemId).eq('room_id', room.id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}
