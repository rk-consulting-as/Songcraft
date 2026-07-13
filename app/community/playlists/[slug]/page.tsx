import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import V2CommunityAnalyticsTracker from '@/components/v2/V2CommunityAnalyticsTracker'
import V2CuratorRoomDashboard from '@/components/v2/V2CuratorRoomDashboard'
import V2PostAuthCommunityAction from '@/components/v2/V2PostAuthCommunityAction'
import { V2SavePlaylistRoomButton } from '@/components/v2/V2CommunityFollowSaveButtons'
import V2PublicAuthCta from '@/components/v2/V2PublicAuthCta'
import V2PublicRestrictedState from '@/components/v2/V2PublicRestrictedState'
import V2ShareButton from '@/components/v2/V2ShareButton'
import { fetchCuratorRoomDashboard } from '@/lib/v2/data/curatorRooms'
import { getPlaylistRoomSaveState } from '@/lib/v2/data/followsSaves'
import { fetchRoomCircleVisibility } from '@/lib/v2/data/publicDiscovery'
import { fetchPlaylistRoomActivity } from '@/lib/v2/data/streamEngine'
import { fetchPlaybackContextSummary } from '@/lib/playback/data/fetchPlaybackContext'
import { getLatestReport } from '@/lib/playback/PlaybackEvidence'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { isPublicCircleVisibility } from '@/lib/v2/publicVisibility'
import { playlistRoomPageMetadata } from '@/lib/v2/seo/communityMetadata'
import { fetchIsV2Admin } from '@/lib/v2/hostAccess'
import { fetchUserPlaylistRoomListened } from '@/lib/v2/data/supporters'
import { V2_ROUTES } from '@/lib/v2/routes'
import { CURATOR_LABELS } from '@/lib/v2/types'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'
import { v2ServiceClient } from '@/lib/v2/apiAuth'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const visibility = await fetchRoomCircleVisibility(params.slug)
  if (visibility && !isPublicCircleVisibility(visibility)) {
    return { title: 'Curator Room · ViaTone' }
  }
  const { dashboard } = await fetchCuratorRoomDashboard(params.slug)
  if (!dashboard) return { title: 'Room not found' }
  return playlistRoomPageMetadata(dashboard.room)
}

export default async function CuratorRoomPage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const returnPath = V2_ROUTES.playlistRoom(params.slug)

  const circleVisibility = await fetchRoomCircleVisibility(params.slug)
  if (circleVisibility && !isPublicCircleVisibility(circleVisibility) && !user) {
    return <V2PublicRestrictedState entity="playlist_room" visibility={circleVisibility === 'invite' ? 'invite' : 'private'} />
  }

  const { dashboard, fromMock } = await fetchCuratorRoomDashboard(params.slug, user?.id)
  if (!dashboard) notFound()
  const { room } = dashboard

  if (circleVisibility && !isPublicCircleVisibility(circleVisibility) && user) {
    const isMember = room.circleSlug
      ? await (await import('@/lib/v2/data/community')).fetchCircleMembership(room.circleSlug, user.id)
      : false
    const isAdmin = await fetchIsV2Admin(supabase, user.id)
    if (!isMember && user.id !== room.ownerUserId && !isAdmin) {
      return <V2PublicRestrictedState entity="playlist_room" visibility={circleVisibility === 'invite' ? 'invite' : 'private'} />
    }
  }

  const isPublic = !circleVisibility || isPublicCircleVisibility(circleVisibility)

  const activityData = fromMock
    ? {
      recentSubmissions: [],
      lastPlayed: [],
      listenedCount: 0,
      participationCount: 0,
      roundStatus: 'active' as const,
      linkedSessions: [],
      recentSupporters: [],
      topSupportersThisWeek: [],
    }
    : await fetchPlaylistRoomActivity(room.id, room.circleId)

  const isAdmin = user ? await fetchIsV2Admin(supabase, user.id) : false
  const isHost = user?.id === room.ownerUserId || isAdmin
  const userListened = user && !fromMock ? await fetchUserPlaylistRoomListened(room.id, user.id) : false
  const { songs: mySongs } = user ? await fetchCommunitySongs() : { songs: [] }
  const saveState = isPublic && !fromMock
    ? await getPlaylistRoomSaveState(user?.id ?? null, room.id)
    : { saved: false, saveCount: 0 }

  const sb = v2ServiceClient()
  const [playbackSummary, playbackReport] = !fromMock
    ? await Promise.all([
      fetchPlaybackContextSummary('v2_playlist_room', room.id),
      getLatestReport(sb, 'v2_playlist_room', room.id),
    ])
    : [{
      available: false,
      labels: PLAYBACK_LABELS,
      sessions: [],
      report: null,
      sessionCount: 0,
      highConfidenceCount: 0,
      averageCompletion: 0,
    }, null]

  const primaryPlaylist = dashboard.linkedPlaylists[0]

  return (
    <>
      {isPublic && <V2CommunityAnalyticsTracker entityType="playlist_room" entityId={room.id} />}
      {user && <V2PostAuthCommunityAction isLoggedIn playlistSlug={room.slug} />}
      {fromMock && <p className="v2-meta" style={{ marginBottom: 12 }}>Demo Curator Room — seed migrations for live data.</p>}

      <div className="v2-detail-hero" style={{ ['--v2-cover-img' as string]: `url('${room.coverImageUrl}')` }}>
        <div className="v2-eyebrow">
          {CURATOR_LABELS.room} · {room.platform} · {room.submissionOpen === false ? 'Submissions closed' : 'Submissions open'}
        </div>
        <h1>{room.name}</h1>
        <p className="v2-meta" style={{ fontSize: 16, maxWidth: 680 }}>
          A community built around playlists, song submissions, listening sessions, feedback, and curator decisions.
        </p>
        <p className="v2-meta" style={{ maxWidth: 640 }}>
          {room.description}
        </p>
        {dashboard.hostName && (
          <p className="v2-meta">Curated by {dashboard.hostName} · {saveState.saveCount} saves · {dashboard.memberCount} members</p>
        )}
        <div className="v2-tagrow">
          {dashboard.room.roomMeta?.dna?.genres?.slice(0, 4).map(g => <span key={g} className="v2-tag">{g}</span>)}
          <span className="v2-tag">{room.trackCount} submissions</span>
          {dashboard.visibility && <span className="v2-tag">{dashboard.visibility}</span>}
        </div>
        <div className="v2-hero-actions v2-hero-cta-row" style={{ marginTop: 12 }}>
          {isPublic && (
            <V2SavePlaylistRoomButton
              slug={room.slug}
              returnPath={returnPath}
              initialSaved={saveState.saved}
              saveCount={saveState.saveCount}
              isLoggedIn={!!user}
              demoMode={fromMock}
            />
          )}
          {primaryPlaylist && (
            <a href={primaryPlaylist.playlistUrl} target="_blank" rel="noopener noreferrer" className="v2-btn hot sm">Open playlist ↗</a>
          )}
          {upcomingSessionLink(dashboard.upcomingSession)}
          {room.circleSlug && (
            <Link href={V2_ROUTES.circle(room.circleSlug)} className="v2-btn secondary sm">View circle</Link>
          )}
          {isPublic && (
            <V2ShareButton path={returnPath} title={room.name} inviteMessage={`Join ${room.name} on ViaTone Community.`} compact />
          )}
        </div>
      </div>

      {!user && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2PublicAuthCta returnPath={returnPath} title="Sign in to participate" description="Submit songs, follow this Curator Room, and join listening sessions." />
        </section>
      )}

      <V2CuratorRoomDashboard
        dashboard={dashboard}
        activity={user ? activityData : { ...activityData, recentSupporters: [], topSupportersThisWeek: [] }}
        playbackSummary={playbackSummary}
        playbackReport={playbackReport}
        mySongs={mySongs.filter(s => s.legacySongId)}
        isHost={isHost && !!user}
        isLoggedIn={!!user}
        userListened={userListened}
        demoMode={fromMock}
      />
    </>
  )
}

function upcomingSessionLink(session: { id: string; title: string } | null | undefined) {
  if (!session) return null
  return (
    <Link href={V2_ROUTES.session(session.id)} className="v2-btn secondary sm">Join next session</Link>
  )
}
