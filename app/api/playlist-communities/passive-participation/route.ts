import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { fetchWeeklyParticipationDigest } from '@/lib/passiveParticipation/digest'
import { fetchParticipationWidgetStats } from '@/lib/passiveParticipation/widget'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const view = req.nextUrl.searchParams.get('view') || 'all'

  if (view === 'digest') {
    const digest = await fetchWeeklyParticipationDigest(auth.sb, auth.userId)
    return NextResponse.json({ digest })
  }

  if (view === 'widget') {
    const widget = await fetchParticipationWidgetStats(auth.sb, auth.userId)
    return NextResponse.json({ widget })
  }

  const [widget, digest] = await Promise.all([
    fetchParticipationWidgetStats(auth.sb, auth.userId),
    fetchWeeklyParticipationDigest(auth.sb, auth.userId),
  ])

  return NextResponse.json({ widget, digest })
}
