import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { isCampaignOwner } from '@/lib/playlistCommunities/campaignAccess'
import { computePassiveCampaignHealthScore } from '@/lib/passiveParticipation/healthScore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const owner = await isCampaignOwner(auth.sb, params.id, auth.userId)
  if (!owner) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const health = await computePassiveCampaignHealthScore(auth.sb, params.id, auth.userId)
  return NextResponse.json({ health })
}
