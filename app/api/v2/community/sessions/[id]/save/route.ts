import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { trackCommunityEvent } from '@/lib/v2/communityAnalytics'
import { saveSessionForUser } from '@/lib/v2/data/followsSaves'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveSession(idOrSlug: string) {
  return v2ServiceClient()
    .from('v2_sessions')
    .select('id, v2_circles(visibility)')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle()
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const circle = (session as { v2_circles?: { visibility?: string } | { visibility?: string }[] }).v2_circles
  const vis = Array.isArray(circle) ? circle[0]?.visibility : circle?.visibility
  if (vis && vis !== 'public') return NextResponse.json({ error: 'session_not_public' }, { status: 403 })

  await saveSessionForUser(sb, userId, session.id as string)
  await trackCommunityEvent(sb, { eventType: 'community_save', entityType: 'session', entityId: session.id as string })

  const { count } = await v2ServiceClient()
    .from('v2_saved_community_items')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'session')
    .eq('entity_id', session.id)

  return NextResponse.json({ ok: true, saved: true, saveCount: count || 0 })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(_req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  await sb.from('v2_saved_community_items').delete()
    .eq('user_id', userId)
    .eq('entity_type', 'session')
    .eq('entity_id', session.id)

  const { count } = await v2ServiceClient()
    .from('v2_saved_community_items')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'session')
    .eq('entity_id', session.id)

  return NextResponse.json({ ok: true, saved: false, saveCount: count || 0 })
}
