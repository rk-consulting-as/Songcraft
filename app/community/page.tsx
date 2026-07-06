import CommunityHomeClient from '@/components/v2/CommunityHomeClient'
import { fetchCommunityCircles, fetchCommunitySessions } from '@/lib/v2/data/community'
import { fetchCommunityPersonalization } from '@/lib/v2/data/personalization'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'

export const dynamic = 'force-dynamic'

export default async function CommunityHomePage() {
  const [
    { sessions, fromMock: sessionsMock },
    { circles, fromMock: circlesMock },
    { songs },
    personalization,
  ] = await Promise.all([
    fetchCommunitySessions(),
    fetchCommunityCircles(),
    fetchCommunitySongs(),
    fetchCommunityPersonalization(),
  ])

  const feedbackSongs = songs.filter(s => s.needsFeedback).slice(0, 6)

  return (
    <CommunityHomeClient
      sessions={personalization.joinedSessions.length ? personalization.joinedSessions : sessions}
      circles={circles}
      feedbackSongs={feedbackSongs}
      usingDemoData={sessionsMock || circlesMock}
      personalization={personalization}
    />
  )
}
