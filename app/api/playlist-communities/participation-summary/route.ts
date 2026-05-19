import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { fetchUserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const summary = await fetchUserParticipationSummary(auth.sb, auth.userId)
  return NextResponse.json({ summary })
}
