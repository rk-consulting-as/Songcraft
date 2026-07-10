import { NextRequest, NextResponse } from 'next/server'
import { fetchCalendarSessions } from '@/lib/v2/data/sessionCalendar'
import type { V2CalendarView } from '@/lib/v2/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VIEWS = new Set<V2CalendarView>(['upcoming', 'this_week', 'my_sessions', 'hosting'])

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('view') || 'upcoming'
  const view = VIEWS.has(raw as V2CalendarView) ? (raw as V2CalendarView) : 'upcoming'
  const { groups, fromMock, userId } = await fetchCalendarSessions(view)
  return NextResponse.json({ groups, fromMock, userId, view })
}
