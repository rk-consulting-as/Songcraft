import { redirect } from 'next/navigation'
import V2HostDashboardClient from '@/components/v2/V2HostDashboardClient'
import { fetchHostDashboard } from '@/lib/v2/data/hostDashboard'
import { computeHostReminders } from '@/lib/v2/data/communityReminders'
import { createServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function HostDashboardPage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dashboard = await fetchHostDashboard(user.id)
  const hostReminders = computeHostReminders(dashboard)

  return <V2HostDashboardClient dashboard={dashboard} hostReminders={hostReminders} />
}
