import { NextRequest, NextResponse } from 'next/server'
import { requireV2User } from '@/lib/v2/apiAuth'
import {
  formatCommunityNotification,
  markAllCommunityNotificationsRead,
  markCommunityNotificationRead,
} from '@/lib/v2/data/communityNotifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 20))

  const [{ data: rows }, { count }] = await Promise.all([
    sb.from('v2_community_notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
    sb.from('v2_community_notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false),
  ])

  const notifications = (rows || []).map(r => formatCommunityNotification({
    id: String(r.id),
    userId: String(r.user_id),
    kind: String(r.kind),
    title: String(r.title),
    body: r.body ?? undefined,
    ctaLabel: r.cta_label ?? undefined,
    ctaHref: r.cta_href ?? undefined,
    entityType: r.entity_type ?? undefined,
    entityId: r.entity_id ?? undefined,
    metadata: r.metadata || {},
    isRead: Boolean(r.is_read),
    createdAt: String(r.created_at),
  }))

  return NextResponse.json({ notifications, unreadCount: count || 0 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))

  if (body.all === true) {
    await markAllCommunityNotificationsRead(sb, userId)
    return NextResponse.json({ ok: true })
  }

  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  await markCommunityNotificationRead(sb, userId, id)
  return NextResponse.json({ ok: true })
}
