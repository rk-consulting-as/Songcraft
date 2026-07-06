import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveCircle(slug: string) {
  const sb = v2ServiceClient()
  return sb.from('v2_circles').select('id, slug, name, visibility, owner_user_id').eq('slug', slug).maybeSingle()
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: circle, error: circleErr } = await resolveCircle(params.slug)
  if (circleErr || !circle) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (circle.visibility !== 'public') return NextResponse.json({ error: 'circle_not_joinable' }, { status: 403 })

  const { data, error } = await sb
    .from('v2_circle_members')
    .upsert({ circle_id: circle.id, user_id: userId, role: 'member' }, { onConflict: 'circle_id,user_id' })
    .select('id, joined_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, membership: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: circle } = await resolveCircle(params.slug)
  if (!circle) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { error } = await sb
    .from('v2_circle_members')
    .delete()
    .eq('circle_id', circle.id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  const { data: circle } = await resolveCircle(params.slug)
  if (!circle) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let isMember = false
  if (auth) {
    const { data } = await auth.sb
      .from('v2_circle_members')
      .select('id')
      .eq('circle_id', circle.id)
      .eq('user_id', auth.userId)
      .maybeSingle()
    isMember = !!data
  }

  return NextResponse.json({ isMember, slug: params.slug })
}
