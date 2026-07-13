import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { fetchCuratorRoomDashboard } from '@/lib/v2/data/curatorRooms'
import type { V2CuratorRoomMeta } from '@/lib/v2/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveRoom(slug: string) {
  const sb = v2ServiceClient()
  return sb.from('v2_playlist_rooms').select('id, slug, owner_user_id, room_meta').eq('slug', slug).maybeSingle()
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { dashboard, fromMock } = await fetchCuratorRoomDashboard(params.slug)
  if (!dashboard) return NextResponse.json({ error: 'not_found', fromMock }, { status: 404 })
  return NextResponse.json({ dashboard, fromMock })
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: room } = await resolveRoom(params.slug)
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (room.owner_user_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const currentMeta = (room.room_meta as V2CuratorRoomMeta) || {}
  const nextMeta: V2CuratorRoomMeta = { ...currentMeta }

  if (body.room_meta && typeof body.room_meta === 'object') {
    Object.assign(nextMeta, body.room_meta)
    if (body.room_meta.dna) nextMeta.dna = { ...currentMeta.dna, ...body.room_meta.dna }
  }

  const patch: Record<string, unknown> = { room_meta: nextMeta }
  if (typeof body.submission_open === 'boolean') patch.submission_open = body.submission_open
  if (typeof body.description === 'string') patch.description = body.description.slice(0, 2000)

  const { error } = await sb.from('v2_playlist_rooms').update(patch).eq('id', room.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, room_meta: nextMeta })
}
