import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import V2CommunityAnalyticsTracker from '@/components/v2/V2CommunityAnalyticsTracker'
import V2EmptyState from '@/components/v2/V2EmptyState'
import V2PostAuthCommunityAction from '@/components/v2/V2PostAuthCommunityAction'
import V2PlaylistListenButton from '@/components/v2/V2PlaylistListenButton'
import { V2SavePlaylistRoomButton } from '@/components/v2/V2CommunityFollowSaveButtons'
import V2PlaylistRoomEngine from '@/components/v2/V2PlaylistRoomEngine'
import V2PublicAuthCta from '@/components/v2/V2PublicAuthCta'
import V2PublicRestrictedState from '@/components/v2/V2PublicRestrictedState'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2ShareButton from '@/components/v2/V2ShareButton'
import V2SubmitSongPanel from '@/components/v2/V2SubmitSongPanel'
import V2PlaybackContextSection from '@/components/playback/V2PlaybackContextSection'
import { fetchPlaylistRoomBySlug } from '@/lib/v2/data/community'
import { getPlaylistRoomSaveState } from '@/lib/v2/data/followsSaves'
import { fetchRoomCircleVisibility } from '@/lib/v2/data/publicDiscovery'
import { fetchPlaylistRoomActivity } from '@/lib/v2/data/streamEngine'
import { isPublicCircleVisibility } from '@/lib/v2/publicVisibility'
import { playlistRoomPageMetadata } from '@/lib/v2/seo/communityMetadata'
import { fetchIsV2Admin } from '@/lib/v2/hostAccess'
import { fetchUserPlaylistRoomListened } from '@/lib/v2/data/supporters'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const visibility = await fetchRoomCircleVisibility(params.slug)
  if (visibility && !isPublicCircleVisibility(visibility)) {
    return { title: 'Playlist room · ViaTone' }
  }
  const { room } = await fetchPlaylistRoomBySlug(params.slug)
  if (!room) return { title: 'Room not found' }
  return playlistRoomPageMetadata(room)
}

export default async function PlaylistRoomPage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const returnPath = V2_ROUTES.playlistRoom(params.slug)

  const circleVisibility = await fetchRoomCircleVisibility(params.slug)
  if (circleVisibility && !isPublicCircleVisibility(circleVisibility) && !user) {
    return <V2PublicRestrictedState entity="playlist_room" visibility={circleVisibility === 'invite' ? 'invite' : 'private'} />
  }

  const { room, fromMock } = await fetchPlaylistRoomBySlug(params.slug)
  if (!room) notFound()

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

  const { data: items } = fromMock
    ? { data: null }
    : await supabase
      .from('v2_playlist_room_items')
      .select('id, title, artist_name, position, external_url, created_at, played_at')
      .eq('room_id', room.id)
      .order('position', { ascending: true })

  return (
    <>
      {isPublic && <V2CommunityAnalyticsTracker entityType="playlist_room" entityId={room.id} />}
      {user && <V2PostAuthCommunityAction isLoggedIn playlistSlug={room.slug} />}
      {fromMock && <p className="v2-meta" style={{ marginBottom: 12 }}>Demo playlist room — seed migrations for live data.</p>}
      <div className="v2-detail-hero" style={{ ['--v2-cover-img' as string]: `url('${room.coverImageUrl}')` }}>
        <div className="v2-eyebrow">{room.platform} · {room.trackCount} tracks · Stream Engine Beta</div>
        <h1>{room.name}</h1>
        <p className="v2-meta" style={{ fontSize: 16, maxWidth: 640 }}>{room.description}</p>
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
          {room.circleSlug && (
            <Link href={V2_ROUTES.circle(room.circleSlug)} className="v2-btn secondary sm">View circle</Link>
          )}
          {isPublic && (
            <V2ShareButton path={returnPath} title={room.name} inviteMessage={`Join ${room.name} on ViaTone Community.`} compact />
          )}
          {room.campaignId && (
            <Link href={`/playlist-campaigns/${room.campaignId}`} className="v2-btn secondary sm">Playlist campaign ↗</Link>
          )}
        </div>
      </div>

      {!user && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2PublicAuthCta returnPath={returnPath} title="Sign in to participate" description="Join this playlist room to submit songs and confirm listening." />
        </section>
      )}

      {user && (
      <section className="v2-section">
        <V2SectionHeader title="Submit to playlist room" lead="Participation is logged for community support rounds." />
        <div className="v2-card">
          <V2SubmitSongPanel target={{ type: 'playlist', slug: room.slug, label: room.name }} songs={mySongs.filter(s => s.legacySongId)} demoMode={fromMock} />
        </div>
      </section>
      )}

      <section className="v2-section">
        <V2SectionHeader title="Room activity" />
        {user && !isHost && (
          <V2PlaylistListenButton roomSlug={room.slug} initialListened={userListened} demoMode={fromMock} />
        )}
        <V2PlaylistRoomEngine roomSlug={room.slug} roomId={room.id} isHost={isHost && !!user} demoMode={fromMock} activity={user ? activityData : { ...activityData, recentSupporters: [], topSupportersThisWeek: [] }} />
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Full queue" />
        <div className="v2-card">
          {(items || []).length === 0 && (
            <V2EmptyState
              icon="♫"
              title="No songs in this room yet"
              description="Playlist rooms organize listening rounds and shared support. Submit a song above to add the first track."
              actionLabel="Submit a song"
              actionHref={V2_ROUTES.playlistRoom(room.slug)}
            />
          )}
          {(items || []).map(item => (
            <div key={item.id} className="v2-track">
              <span className="num">{item.position}</span>
              <div><b>{item.title}</b><span>{item.artist_name}{item.played_at ? ' · played' : ''}</span></div>
              {item.external_url && <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="v2-meta">Open ↗</a>}
            </div>
          ))}
        </div>
      </section>

      {!fromMock && (
        <V2PlaybackContextSection
          contextType="v2_playlist_room"
          contextId={room.id}
          showControls={!!user}
          isLoggedIn={!!user}
          demoMode={fromMock}
        />
      )}
    </>
  )
}
