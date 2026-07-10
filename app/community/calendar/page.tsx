import V2CalendarClient from '@/components/v2/V2CalendarClient'
import { fetchCalendarSessions } from '@/lib/v2/data/sessionCalendar'
import type { V2CalendarView } from '@/lib/v2/types'

export const dynamic = 'force-dynamic'

type Props = { searchParams: { view?: string } }

export default async function CommunityCalendarPage({ searchParams }: Props) {
  const raw = searchParams.view || 'upcoming'
  const view = (['upcoming', 'this_week', 'my_sessions', 'hosting'].includes(raw) ? raw : 'upcoming') as V2CalendarView
  const { groups, fromMock, userId } = await fetchCalendarSessions(view)

  return (
    <V2CalendarClient
      initialGroups={groups}
      initialView={view}
      fromMock={fromMock}
      userId={userId}
    />
  )
}
