import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { isCampaignOwner } from '@/lib/playlistCommunities/campaignAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; logId: string } }
) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const owner = await isCampaignOwner(sb, params.id, userId)

  const { data: existing } = await sb
    .from('campaign_activity_logs')
    .select('*')
    .eq('id', params.logId)
    .eq('campaign_id', params.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (!owner && existing.user_id !== userId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const patch: Record<string, unknown> = {}

  if (owner) {
    const status = body.status
    if (['approved', 'rejected', 'missed', 'submitted', 'pending'].includes(status)) {
      patch.status = status
      patch.reviewed_by = userId
      patch.reviewed_at = new Date().toISOString()
    }
    if (body.owner_note !== undefined) patch.owner_note = body.owner_note ? String(body.owner_note).slice(0, 2000) : null
    if (body.proof_type === 'manual') {
      patch.proof_type = 'manual'
      if (body.proof_text) patch.proof_text = String(body.proof_text).slice(0, 8000)
    }
  } else if (['submitted', 'pending'].includes(existing.status)) {
    if (body.proof_text !== undefined) patch.proof_text = String(body.proof_text).slice(0, 8000)
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('campaign_activity_logs')
    .update(patch)
    .eq('id', params.logId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
