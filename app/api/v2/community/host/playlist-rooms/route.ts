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
  if (!access.canCreatePlaylistRoom) {
    return NextResponse.json({ error: 'host_pro_required' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const name = clipText(body.name, 120)
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const slugBase = slugifyCommunityName(typeof body.slug === 'string' && body.slug ? body.slug : name)
  const slug = slugBase || `room-${userId.slice(0, 8)}`

  let circleId: string | null = typeof body.circle_id === 'string' ? body.circle_id : null
  if (circleId) {
    const { data: circle } = await sb.from('v2_circles').select('id, owner_user_id').eq('id', circleId).maybeSingle()
    if (!circle || (circle.owner_user_id !== userId && !access.isAdmin)) {
      return NextResponse.json({ error: 'circle_not_owned' }, { status: 403 })
    }
  }

  const { data, error } = await sb
    .from('v2_playlist_rooms')
    .insert({
      owner_user_id: userId,
      circle_id: circleId,
      slug,
      name,
      description: clipText(body.description, 500) || null,
      platform: typeof body.platform === 'string' ? body.platform : 'spotify',
      round_status: 'active',
    })
    .select('id, slug, name')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'slug_taken' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ room: data })
}
