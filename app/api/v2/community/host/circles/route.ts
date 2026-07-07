import { NextRequest, NextResponse } from 'next/server'
import { clipText, requireV2User } from '@/lib/v2/apiAuth'
import { resolveV2HostCapabilities } from '@/lib/v2/hostAccess'
import { slugifyCommunityName } from '@/lib/v2/slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function assertCanCreate(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return { error: NextResponse.json({ error: 'not_authenticated' }, { status: 401 }) }
  const access = await resolveV2HostCapabilities(auth.sb, auth.userId)
  if (!access.canCreateCircle) {
    return { error: NextResponse.json({ error: 'host_pro_required' }, { status: 403 }) }
  }
  return { auth, access }
}

export async function POST(req: NextRequest) {
  const gate = await assertCanCreate(req)
  if ('error' in gate && gate.error) return gate.error
  const { auth } = gate as { auth: NonNullable<Awaited<ReturnType<typeof requireV2User>>> }
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const name = clipText(body.name, 80)
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const slugBase = slugifyCommunityName(typeof body.slug === 'string' && body.slug ? body.slug : name)
  const slug = slugBase || `circle-${userId.slice(0, 8)}`

  const { data, error } = await sb
    .from('v2_circles')
    .insert({
      owner_user_id: userId,
      slug,
      name,
      description: clipText(body.description, 500) || null,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 8).map(String) : [],
      visibility: body.visibility === 'private' || body.visibility === 'invite' ? body.visibility : 'public',
    })
    .select('id, slug, name')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'slug_taken' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sb.from('v2_circle_members').upsert({
    circle_id: data.id,
    user_id: userId,
    role: 'host',
  }, { onConflict: 'circle_id,user_id' })

  return NextResponse.json({ circle: data })
}
