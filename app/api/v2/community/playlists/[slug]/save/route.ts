import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { trackCommunityEvent } from '@/lib/v2/communityAnalytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveRoom(slug: string) {
  return v2ServiceClient()
    .from('v2_playlist_rooms')
    .select('id, slug, v2_circles(visibility)')
    .eq('slug', slug)
    .maybeSingle()
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: room } = await resolveRoom(params.slug)
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const circle = (room as { v2_circles?: { visibility?: string } | { visibility?: string }[] }).v2_circles
  const vis = Array.isArray(circle) ? circle[0]?.visibility : circle?.visibility
  if (!vis || vis !== 'public') return NextResponse.json({ error: 'room_not_public' }, { status: 403 })

  await sb.from('v2_saved_community_items').upsert(
    { user_id: userId, entity_type: 'playlist_room', entity_id: room.id },
    { onConflict: 'user_id,entity_type,entity_id' },
  )
  await trackCommunityEvent(sb, { eventType: 'community_save', entityType: 'playlist_room', entityId: room.id as string })

  const { count } = await v2ServiceClient()
    .from('v2_saved_community_items')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'playlist_room')
    .eq('entity_id', room.id)

  return NextResponse.json({ ok: true, saved: true, saveCount: count || 0 })
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(_req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: room } = await resolveRoom(params.slug)
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  await sb.from('v2_saved_community_items').delete()
    .eq('user_id', userId)
    .eq('entity_type', 'playlist_room')
    .eq('entity_id', room.id)

  const { count } = await v2ServiceClient()
    .from('v2_saved_community_items')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'playlist_room')
    .eq('entity_id', room.id)

  return NextResponse.json({ ok: true, saved: false, saveCount: count || 0 })
}
