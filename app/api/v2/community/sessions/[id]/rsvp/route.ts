import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { saveSessionForUser } from '@/lib/v2/data/followsSaves'

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

const VALID = new Set(['going', 'interested'])

/** Set RSVP: Going or Interested */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.status === 'ended') return NextResponse.json({ error: 'session_ended' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const status = typeof body.status === 'string' && VALID.has(body.status) ? body.status : null
  if (!status) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const circleRaw = (session as unknown as { v2_circles?: { visibility: string } | { visibility: string }[] | null }).v2_circles
  const circle = Array.isArray(circleRaw) ? circleRaw[0] : circleRaw
  if (circle && circle.visibility !== 'public') {
    return NextResponse.json({ error: 'session_not_public' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const { data, error } = await sb
    .from('v2_session_participation')
    .upsert(
      { session_id: session.id, user_id: userId, rsvp_status: status, rsvp_at: now, status: 'reserved' },
      { onConflict: 'session_id,user_id' },
    )
    .select('id, rsvp_status, rsvp_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'going') {
    await saveSessionForUser(sb, userId, session.id as string).catch(() => {})
  }

  const [{ count: going }, { count: interested }] = await Promise.all([
    sb.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('session_id', session.id).eq('rsvp_status', 'going'),
    sb.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('session_id', session.id).eq('rsvp_status', 'interested'),
  ])
  const counts = { going: going || 0, interested: interested || 0, total: (going || 0) + (interested || 0) }
  return NextResponse.json({ rsvp: data, counts })
}

/** Cancel RSVP */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(_req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { error } = await sb
    .from('v2_session_participation')
    .update({ rsvp_status: null, rsvp_at: null })
    .eq('session_id', session.id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [{ count: going }, { count: interested }] = await Promise.all([
    sb.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('session_id', session.id).eq('rsvp_status', 'going'),
    sb.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('session_id', session.id).eq('rsvp_status', 'interested'),
  ])
  const counts = { going: going || 0, interested: interested || 0, total: (going || 0) + (interested || 0) }
  return NextResponse.json({ ok: true, counts })
}
