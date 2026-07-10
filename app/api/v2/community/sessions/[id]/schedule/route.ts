import { NextRequest, NextResponse } from 'next/server'
import { clipText, requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { canManageSessionHost } from '@/lib/v2/hostAccess'
import { notifyCircleFollowersNewSession } from '@/lib/v2/data/followNotifications'
import { slugifyCommunityName } from '@/lib/v2/slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECURRENCE = new Set(['weekly', 'biweekly', 'monthly'])

async function resolveSession(idOrSlug: string) {
  const sb = v2ServiceClient()
  return sb
    .from('v2_sessions')
    .select('id, slug, title, host_user_id, circle_id, starts_at, ends_at, timezone, is_recurring, recurrence_rule, parent_session_id, description, platform, status')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle()
}

/** Host: update session schedule / recurrence */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const canHost = await canManageSessionHost(sb, userId, session.host_user_id as string)
  if (!canHost) return NextResponse.json({ error: 'host_only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if (typeof body.starts_at === 'string') patch.starts_at = body.starts_at
  if (typeof body.ends_at === 'string') patch.ends_at = body.ends_at
  if (body.ends_at === null) patch.ends_at = null
  if (typeof body.timezone === 'string') patch.timezone = clipText(body.timezone, 64) || null
  if (typeof body.is_recurring === 'boolean') patch.is_recurring = body.is_recurring
  if (typeof body.recurrence_rule === 'string' && RECURRENCE.has(body.recurrence_rule)) {
    patch.recurrence_rule = body.recurrence_rule
    patch.is_recurring = true
  }
  if (body.recurrence_rule === null || body.recurrence_rule === false) {
    patch.recurrence_rule = null
    patch.is_recurring = false
  }

  if (!Object.keys(patch).length) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const { data, error } = await sb.from('v2_sessions').update(patch).eq('id', session.id).select('id, starts_at, ends_at, timezone, is_recurring, recurrence_rule').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (patch.starts_at && session.circle_id) {
    const service = v2ServiceClient()
    const { data: circle } = await service.from('v2_circles').select('name, visibility').eq('id', session.circle_id).maybeSingle()
    if (circle?.visibility === 'public') {
      await notifyCircleFollowersNewSession({
        circleId: session.circle_id as string,
        circleName: circle.name as string,
        sessionId: session.id as string,
        sessionTitle: session.title as string,
        hostUserId: session.host_user_id as string,
      })
    }
  }

  return NextResponse.json({ session: data })
}

/** Host: duplicate session or create next recurring occurrence */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const canHost = await canManageSessionHost(sb, userId, session.host_user_id as string)
  if (!canHost) return NextResponse.json({ error: 'host_only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const action = body.action === 'next_occurrence' ? 'next_occurrence' : 'duplicate'

  let startsAt = session.starts_at as string
  if (action === 'next_occurrence' && session.is_recurring && session.recurrence_rule) {
    const base = new Date(startsAt)
    const rule = session.recurrence_rule as string
    if (rule === 'weekly') base.setDate(base.getDate() + 7)
    else if (rule === 'biweekly') base.setDate(base.getDate() + 14)
    else if (rule === 'monthly') base.setMonth(base.getMonth() + 1)
    startsAt = base.toISOString()
  } else if (typeof body.starts_at === 'string') {
    startsAt = body.starts_at
  } else {
    startsAt = new Date(Date.now() + 7 * 86400000).toISOString()
  }

  const slugBase = slugifyCommunityName(`${session.slug}-copy-${Date.now().toString(36)}`)
  const parentId = action === 'next_occurrence' ? session.id : (session.parent_session_id || session.id)

  const { data, error } = await sb
    .from('v2_sessions')
    .insert({
      host_user_id: userId,
      circle_id: session.circle_id,
      slug: slugBase,
      title: session.title,
      description: session.description,
      platform: session.platform,
      starts_at: startsAt,
      ends_at: session.ends_at,
      timezone: session.timezone,
      is_recurring: session.is_recurring,
      recurrence_rule: session.recurrence_rule,
      parent_session_id: parentId,
      status: 'upcoming',
      features: ['Stream Engine Beta', 'Community feedback'],
    })
    .select('id, slug, title, starts_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (session.circle_id) {
    const service = v2ServiceClient()
    const { data: circle } = await service.from('v2_circles').select('name, visibility').eq('id', session.circle_id).maybeSingle()
    if (circle?.visibility === 'public') {
      await notifyCircleFollowersNewSession({
        circleId: session.circle_id as string,
        circleName: circle.name as string,
        sessionId: data.id as string,
        sessionTitle: data.title as string,
        hostUserId: userId,
      })
    }
  }

  return NextResponse.json({ session: data })
}
