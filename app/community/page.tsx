import CommunityHomeClient from '@/components/v2/CommunityHomeClient'
import { fetchCommunityCircles, fetchCommunitySessions } from '@/lib/v2/data/community'
import { fetchCommunityPersonalization } from '@/lib/v2/data/personalization'
import { fetchMyCommunityNotifications } from '@/lib/v2/data/communityNotifications'
import { fetchCommunityReminders } from '@/lib/v2/data/communityReminders'
import { fetchWeeklyDigest } from '@/lib/v2/data/communityDigest'
import { fetchHomeScheduleSessions } from '@/lib/v2/data/sessionCalendar'
import { maybeNotifySavedSessionsStartingSoon } from '@/lib/v2/data/followNotifications'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CommunityHomePage() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(V2_ROUTES.explore)

  const [
    { sessions, fromMock: sessionsMock },
    { circles, fromMock: circlesMock },
    { songs },
    personalization,
    { notifications, unreadCount },
    reminders,
    weeklyDigest,
  ] = await Promise.all([
    fetchCommunitySessions(),
    fetchCommunityCircles(),
    fetchCommunitySongs(),
    fetchCommunityPersonalization(),
    fetchMyCommunityNotifications(20),
    fetchCommunityReminders(),
    fetchWeeklyDigest(),
  ])

  const feedbackSongs = songs.filter(s => s.needsFeedback).slice(0, 6)
  const homeSchedule = await fetchHomeScheduleSessions(personalization.userId)
  if (personalization.userId) {
    await maybeNotifySavedSessionsStartingSoon(personalization.userId).catch(() => {})
  }

  return (
    <CommunityHomeClient
      sessions={personalization.joinedSessions.length ? personalization.joinedSessions : sessions}
      circles={circles}
      feedbackSongs={feedbackSongs}
      usingDemoData={sessionsMock || circlesMock}
      personalization={personalization}
      notifications={notifications}
      unreadCount={unreadCount}
      reminders={reminders}
      weeklyDigest={weeklyDigest}
      homeSchedule={homeSchedule}
    />
  )
}
