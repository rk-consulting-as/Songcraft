import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { trackCommunityEvent } from '@/lib/v2/communityAnalytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveCircle(slug: string) {
  return v2ServiceClient().from('v2_circles').select('id, slug, name, visibility, follower_count').eq('slug', slug).maybeSingle()
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: circle } = await resolveCircle(params.slug)
  if (!circle) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (circle.visibility !== 'public') return NextResponse.json({ error: 'circle_not_public' }, { status: 403 })

  const { error } = await sb.from('v2_circle_follows').upsert(
    { user_id: userId, circle_id: circle.id },
    { onConflict: 'user_id,circle_id' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await trackCommunityEvent(sb, { eventType: 'community_follow', entityType: 'circle', entityId: circle.id })
  const { data: updated } = await v2ServiceClient().from('v2_circles').select('follower_count').eq('id', circle.id).maybeSingle()
  return NextResponse.json({ ok: true, following: true, followerCount: updated?.follower_count || 0 })
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(_req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: circle } = await resolveCircle(params.slug)
  if (!circle) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  await sb.from('v2_circle_follows').delete().eq('circle_id', circle.id).eq('user_id', userId)
  const { data: updated } = await v2ServiceClient().from('v2_circles').select('follower_count').eq('id', circle.id).maybeSingle()
  return NextResponse.json({ ok: true, following: false, followerCount: updated?.follower_count || 0 })
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(_req)
  const { data: circle } = await resolveCircle(params.slug)
  if (!circle) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let following = false
  if (auth) {
    const { data } = await auth.sb.from('v2_circle_follows').select('id').eq('circle_id', circle.id).eq('user_id', auth.userId).maybeSingle()
    following = !!data
  }
  return NextResponse.json({ following, followerCount: circle.follower_count || 0 })
}
