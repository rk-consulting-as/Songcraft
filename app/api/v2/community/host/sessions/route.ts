import { NextRequest, NextResponse } from 'next/server'
import { clipText, requireV2User } from '@/lib/v2/apiAuth'
import { resolveV2HostCapabilities } from '@/lib/v2/hostAccess'
import { slugifyCommunityName } from '@/lib/v2/slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const access = await resolveV2HostCapabilities(sb, userId)
  if (!access.canCreateSession) {
    return NextResponse.json({ error: 'host_pro_required' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const title = clipText(body.title, 120)
  if (!title) return NextResponse.json({ error: 'title_required' }, { status: 400 })

  const slugBase = slugifyCommunityName(typeof body.slug === 'string' && body.slug ? body.slug : title)
  const slug = slugBase || `session-${userId.slice(0, 8)}-${Date.now().toString(36)}`

  let circleId: string | null = typeof body.circle_id === 'string' ? body.circle_id : null
  if (circleId) {
    const { data: circle } = await sb.from('v2_circles').select('id, owner_user_id').eq('id', circleId).maybeSingle()
    if (!circle || (circle.owner_user_id !== userId && !access.isAdmin)) {
      return NextResponse.json({ error: 'circle_not_owned' }, { status: 403 })
    }
  }

  const startsAt = typeof body.starts_at === 'string' ? body.starts_at : new Date().toISOString()

  const { data, error } = await sb
    .from('v2_sessions')
    .insert({
      host_user_id: userId,
      circle_id: circleId,
      slug,
      title,
      description: clipText(body.description, 500) || null,
      platform: typeof body.platform === 'string' ? body.platform : 'spotify',
      starts_at: startsAt,
      status: 'upcoming',
      features: ['Stream Engine Beta', 'Community feedback'],
    })
    .select('id, slug, title, status')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'slug_taken' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ session: data })
}
