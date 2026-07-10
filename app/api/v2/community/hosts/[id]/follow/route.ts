import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { trackCommunityEvent } from '@/lib/v2/communityAnalytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth
  if (userId === params.id) return NextResponse.json({ error: 'cannot_follow_self' }, { status: 400 })

  const { error } = await sb.from('v2_host_follows').upsert(
    { user_id: userId, host_user_id: params.id },
    { onConflict: 'user_id,host_user_id' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await trackCommunityEvent(sb, { eventType: 'community_follow', entityType: 'host', entityId: params.id })
  const { count } = await v2ServiceClient().from('v2_host_follows').select('id', { count: 'exact', head: true }).eq('host_user_id', params.id)
  return NextResponse.json({ ok: true, following: true, followerCount: count || 0 })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(_req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  await sb.from('v2_host_follows').delete().eq('host_user_id', params.id).eq('user_id', userId)
  const { count } = await v2ServiceClient().from('v2_host_follows').select('id', { count: 'exact', head: true }).eq('host_user_id', params.id)
  return NextResponse.json({ ok: true, following: false, followerCount: count || 0 })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(_req)
  const service = v2ServiceClient()
  const { count } = await service.from('v2_host_follows').select('id', { count: 'exact', head: true }).eq('host_user_id', params.id)

  let following = false
  if (auth) {
    const { data } = await auth.sb.from('v2_host_follows').select('id').eq('host_user_id', params.id).eq('user_id', auth.userId).maybeSingle()
    following = !!data
  }
  return NextResponse.json({ following, followerCount: count || 0 })
}
