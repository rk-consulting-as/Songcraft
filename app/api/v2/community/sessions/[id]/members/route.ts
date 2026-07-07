import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { maybeNotifyNewBadges } from '@/lib/v2/data/communityNotifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveSession(idOrSlug: string) {
  const sb = v2ServiceClient()
  return sb
    .from('v2_sessions')
    .select('id, status, v2_circles(visibility)')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle()
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.status === 'ended') return NextResponse.json({ error: 'session_ended' }, { status: 400 })

  const circleRaw = (session as unknown as { v2_circles?: { visibility: string } | { visibility: string }[] | null }).v2_circles
  const circle = Array.isArray(circleRaw) ? circleRaw[0] : circleRaw
  if (circle && circle.visibility !== 'public') {
    return NextResponse.json({ error: 'session_not_public' }, { status: 403 })
  }

  const { data, error } = await sb
    .from('v2_session_participation')
    .upsert({ session_id: session.id, user_id: userId, status: 'joined', left_at: null }, { onConflict: 'session_id,user_id' })
    .select('id, status, joined_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ participation: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { error } = await sb
    .from('v2_session_participation')
    .update({ status: 'left', left_at: new Date().toISOString() })
    .eq('session_id', session.id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if (body.listened === true) patch.listened_at = new Date().toISOString()
  if (typeof body.note === 'string') patch.participation_note = body.note.slice(0, 300)

  if (!Object.keys(patch).length) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const { data, error } = await sb
    .from('v2_session_participation')
    .update(patch)
    .eq('session_id', session.id)
    .eq('user_id', userId)
    .select('id, listened_at, participation_note')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'join_first' }, { status: 400 })

  if (body.listened === true) {
    await maybeNotifyNewBadges(v2ServiceClient(), userId)
  }

  return NextResponse.json({ participation: data })
}
