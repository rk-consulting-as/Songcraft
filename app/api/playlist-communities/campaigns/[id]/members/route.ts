import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/playlistCommunities/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const sbRead = serviceClient()
  const { data: campaign } = await sbRead
    .from('playlist_campaigns')
    .select('id, user_id, status, visibility, max_members, admin_hidden')
    .eq('id', params.id)
    .maybeSingle()

  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (campaign.admin_hidden) return NextResponse.json({ error: 'not_available' }, { status: 403 })
  if (campaign.user_id === userId) return NextResponse.json({ error: 'cannot_join_own_campaign' }, { status: 400 })
  if (!['open', 'active'].includes(campaign.status)) {
    return NextResponse.json({ error: 'campaign_not_open' }, { status: 400 })
  }
  if (campaign.visibility === 'private') {
    return NextResponse.json({ error: 'campaign_private' }, { status: 403 })
  }

  if (campaign.max_members) {
    const { count } = await sbRead
      .from('playlist_campaign_members')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', params.id)
      .in('status', ['requested', 'approved'])
    if ((count || 0) >= campaign.max_members) {
      return NextResponse.json({ error: 'campaign_full' }, { status: 400 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const row = {
    campaign_id: params.id,
    user_id: userId,
    artist_id: body.artist_id || null,
    song_id: body.song_id || null,
    message: body.message || null,
    status: 'requested' as const,
  }

  const { data, error } = await sb
    .from('playlist_campaign_members')
    .upsert(row, { onConflict: 'campaign_id,user_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
