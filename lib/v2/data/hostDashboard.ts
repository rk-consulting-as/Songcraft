import { v2ServiceClient } from '@/lib/v2/apiAuth'
import { mapCircleRow, mapSessionRow } from '@/lib/v2/data/community'
import { resolveV2HostCapabilities } from '@/lib/v2/hostAccess'
import { fetchCircleTopSupporters } from '@/lib/v2/data/supporters'
import type {
  V2HostAnalytics,
  V2HostDashboard,
  V2HostPendingSubmission,
  V2HostRecentParticipation,
  V2PlaylistRoom,
  V2Session,
} from '@/lib/v2/types'

function mapPlaylistRoomRow(row: Record<string, unknown>, circle?: { slug: string }): V2PlaylistRoom {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description || ''),
    coverImageUrl: String(row.cover_image_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80'),
    trackCount: Number(row.track_count || 0),
    circleSlug: circle?.slug,
    circleId: row.circle_id ? String(row.circle_id) : undefined,
    platform: (row.platform as V2PlaylistRoom['platform']) || 'spotify',
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    roundStatus: (row.round_status as V2PlaylistRoom['roundStatus']) || 'active',
    lastCompletedAt: row.last_completed_at ? String(row.last_completed_at) : undefined,
  }
}

export async function fetchHostDashboard(userId: string): Promise<V2HostDashboard> {
  const sb = v2ServiceClient()
  const access = await resolveV2HostCapabilities(sb, userId)

  const [
    { data: circleRows },
    { data: sessionRows },
    { data: roomRows },
  ] = await Promise.all([
    sb.from('v2_circles').select('*').eq('owner_user_id', userId).order('created_at', { ascending: false }),
    sb.from('v2_sessions').select('*, v2_circles(slug, name)').eq('host_user_id', userId).order('starts_at', { ascending: false }),
    sb.from('v2_playlist_rooms').select('*, v2_circles(slug)').eq('owner_user_id', userId).order('created_at', { ascending: false }),
  ])

  const circles = (circleRows || []).map(r => mapCircleRow(r as Record<string, unknown>))
  const sessions: V2Session[] = (sessionRows || []).map(row => {
    const circleRaw = (row as { v2_circles?: { slug: string; name: string } | { slug: string; name: string }[] }).v2_circles
    const circle = Array.isArray(circleRaw) ? circleRaw[0] : circleRaw
    return { ...mapSessionRow(row as Record<string, unknown>, circle), isHost: true }
  })
  const sessionIds = sessions.map(s => s.id)

  const playlistRooms = (roomRows || []).map(row => {
    const circleRaw = (row as { v2_circles?: { slug: string } | { slug: string }[] }).v2_circles
    const circle = Array.isArray(circleRaw) ? circleRaw[0] : circleRaw
    return mapPlaylistRoomRow(row as Record<string, unknown>, circle)
  })
  const roomIds = playlistRooms.map(r => r.id)

  const [{ data: pendingRows }, { data: roomPendingRows }] = await Promise.all([
    sessionIds.length
      ? sb
        .from('v2_session_songs')
        .select('id, title, artist_name, status, created_at, session_id, v2_sessions(title)')
        .eq('status', 'pending')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
        .limit(24)
      : Promise.resolve({ data: [] }),
    roomIds.length
      ? sb
        .from('v2_playlist_room_items')
        .select('id, title, artist_name, status, created_at, room_id, v2_playlist_rooms(slug, name)')
        .in('status', ['pending', 'reviewing'])
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(24)
      : Promise.resolve({ data: [] }),
  ])

  const pendingSubmissions: V2HostPendingSubmission[] = [
    ...(pendingRows || []).map(row => {
      const sessionRaw = (row as { v2_sessions?: { title?: string } | { title?: string }[] }).v2_sessions
      const sessionTitle = Array.isArray(sessionRaw) ? sessionRaw[0]?.title : sessionRaw?.title
      return {
        id: row.id as string,
        title: row.title as string,
        artistName: (row.artist_name as string) || '',
        sessionId: row.session_id as string,
        sessionTitle: sessionTitle || 'Session',
        targetType: 'session' as const,
        status: row.status as V2HostPendingSubmission['status'],
        createdAt: row.created_at as string,
      }
    }),
    ...(roomPendingRows || []).map(row => {
      const roomRaw = (row as { v2_playlist_rooms?: { slug: string; name: string } | { slug: string; name: string }[] }).v2_playlist_rooms
      const room = Array.isArray(roomRaw) ? roomRaw[0] : roomRaw
      return {
        id: row.id as string,
        title: row.title as string,
        artistName: (row.artist_name as string) || '',
        roomId: row.room_id as string,
        roomSlug: room?.slug,
        roomName: room?.name || 'Curator Room',
        targetType: 'playlist_room' as const,
        status: row.status as V2HostPendingSubmission['status'],
        createdAt: row.created_at as string,
      }
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const upcomingSessions = sessions.filter(s => s.status !== 'ended').slice(0, 8)

  let analytics: V2HostAnalytics = {
    totalParticipants: 0,
    songsSubmitted: 0,
    songsPlayed: 0,
    feedbackCount: 0,
    completionRate: 0,
    topSupporters: [],
  }
  const recentParticipation: V2HostRecentParticipation[] = []

  if (sessionIds.length) {
    const [
      { count: participantCount },
      { count: submittedCount },
      { count: playedCount },
      { count: feedbackCount },
      { data: participations },
    ] = await Promise.all([
      sb.from('v2_session_participation').select('id', { count: 'exact', head: true }).in('session_id', sessionIds).eq('status', 'joined'),
      sb.from('v2_session_songs').select('id', { count: 'exact', head: true }).in('session_id', sessionIds).neq('status', 'removed'),
      sb.from('v2_session_play_logs').select('id', { count: 'exact', head: true }).in('session_id', sessionIds),
      sb.from('v2_song_feedback').select('id', { count: 'exact', head: true }).in('session_id', sessionIds),
      sb
        .from('v2_session_participation')
        .select('session_id, listened_at, v2_sessions(title, stream_engine_meta)')
        .in('session_id', sessionIds)
        .eq('status', 'joined')
        .order('joined_at', { ascending: false })
        .limit(80),
    ])

    const ended = sessions.filter(s => s.status === 'ended').length
    analytics = {
      totalParticipants: participantCount || 0,
      songsSubmitted: submittedCount || 0,
      songsPlayed: playedCount || 0,
      feedbackCount: feedbackCount || 0,
      completionRate: sessions.length ? Math.round((ended / sessions.length) * 100) : 0,
      topSupporters: [],
    }

    const bySession: Record<string, { title: string; participants: number; listened: number; completedAt?: string }> = {}
    for (const p of participations || []) {
      const sid = p.session_id as string
      const session = (p as { v2_sessions?: { title?: string; stream_engine_meta?: { completed_at?: string } } }).v2_sessions
      if (!bySession[sid]) {
        bySession[sid] = {
          title: session?.title || 'Session',
          participants: 0,
          listened: 0,
          completedAt: session?.stream_engine_meta?.completed_at,
        }
      }
      bySession[sid].participants += 1
      if (p.listened_at) bySession[sid].listened += 1
    }
    for (const [sessionId, stats] of Object.entries(bySession)) {
      recentParticipation.push({
        sessionId,
        sessionTitle: stats.title,
        participantCount: stats.participants,
        listenedCount: stats.listened,
        completedAt: stats.completedAt,
      })
    }
    recentParticipation.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
  }

  if (circles[0]?.id && access.canViewSupporterReports) {
    analytics.topSupporters = await fetchCircleTopSupporters(circles[0].id, 5)
  } else if (sessionIds.length && access.canViewSupporterReports) {
    const { data: firstSession } = await sb.from('v2_sessions').select('circle_id').eq('id', sessionIds[0]).maybeSingle()
    if (firstSession?.circle_id) {
      analytics.topSupporters = await fetchCircleTopSupporters(firstSession.circle_id, 5)
    }
  }

  return {
    access,
    circles,
    sessions,
    playlistRooms,
    pendingSubmissions,
    upcomingSessions,
    recentParticipation: recentParticipation.slice(0, 8),
    analytics,
  }
}
