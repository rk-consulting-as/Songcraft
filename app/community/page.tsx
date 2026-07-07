import CommunityHomeClient from '@/components/v2/CommunityHomeClient'
import { fetchCommunityCircles, fetchCommunitySessions } from '@/lib/v2/data/community'
import { fetchCommunityPersonalization } from '@/lib/v2/data/personalization'
import { fetchMyCommunityNotifications } from '@/lib/v2/data/communityNotifications'
import { fetchCommunityReminders } from '@/lib/v2/data/communityReminders'
import { fetchWeeklyDigest } from '@/lib/v2/data/communityDigest'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'

export const dynamic = 'force-dynamic'

export default async function CommunityHomePage() {
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
    />
  )
}
