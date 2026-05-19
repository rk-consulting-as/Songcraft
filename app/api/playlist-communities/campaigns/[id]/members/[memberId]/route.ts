import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNER_STATUSES = new Set(['approved', 'rejected', 'removed'])
const SELF_STATUSES = new Set(['left'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const status = String(body.status || '')
  if (!status) return NextResponse.json({ error: 'status_required' }, { status: 400 })

  const { data: member } = await sb
    .from('playlist_campaign_members')
    .select('*')
    .eq('id', params.memberId)
    .eq('campaign_id', params.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: campaign } = await sb
    .from('playlist_campaigns')
    .select('user_id')
    .eq('id', params.id)
    .maybeSingle()

  const isOwner = campaign?.user_id === userId
  const isSelf = member.user_id === userId

  if (isSelf && SELF_STATUSES.has(status)) {
    // member leaving
  } else if (isOwner && OWNER_STATUSES.has(status)) {
    // owner managing
  } else {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data, error } = await sb
    .from('playlist_campaign_members')
    .update({ status })
    .eq('id', params.memberId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
