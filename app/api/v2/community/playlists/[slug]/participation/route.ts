import { NextRequest, NextResponse } from 'next/server'
import { requireV2User } from '@/lib/v2/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: room } = await sb.from('v2_playlist_rooms').select('id').eq('slug', params.slug).maybeSingle()
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  if (body.listened !== true) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const row: Record<string, unknown> = {
    room_id: room.id,
    user_id: userId,
    listened_at: new Date().toISOString(),
  }
  if (typeof body.note === 'string') row.participation_note = body.note.slice(0, 300)

  const { data, error } = await sb
    .from('v2_playlist_room_participation')
    .upsert(row, { onConflict: 'room_id,user_id' })
    .select('id, listened_at, participation_note')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ participation: data })
}
