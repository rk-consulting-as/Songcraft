import { redirect } from 'next/navigation'
import V2HostDashboardClient from '@/components/v2/V2HostDashboardClient'
import { fetchHostDashboard } from '@/lib/v2/data/hostDashboard'
import { computeHostReminders } from '@/lib/v2/data/communityReminders'
import { fetchHostSchedule } from '@/lib/v2/data/sessionCalendar'
import { buildLoginUrl } from '@/lib/v2/authReturn'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function HostDashboardPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(buildLoginUrl(V2_ROUTES.host))

  const dashboard = await fetchHostDashboard(user.id)
  const [hostReminders, hostSchedule] = await Promise.all([
    Promise.resolve(computeHostReminders(dashboard)),
    fetchHostSchedule(user.id),
  ])

  return <V2HostDashboardClient dashboard={dashboard} hostReminders={hostReminders} hostSchedule={hostSchedule} />
}
