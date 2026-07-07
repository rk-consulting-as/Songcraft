import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { canManagePlaylistRoomHost } from '@/lib/v2/hostAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveRoom(slug: string) {
  const sb = v2ServiceClient()
  return sb.from('v2_playlist_rooms').select('id, owner_user_id, slug').eq('slug', slug).maybeSingle()
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
