import { createServerSupabase } from '@/lib/supabase/server'
import { computeEarnedBadges, computeSupporterScore } from '@/lib/v2/badges'
import { fetchCommunityCircles, fetchCommunitySessions, mapCircleRow, mapSessionRow } from '@/lib/v2/data/community'
import {
  EMPTY_SCORE,
  fetchActivityEvidenceAvailable,
  fetchUserParticipationCounts,
  fetchUserParticipationHistory,
  suggestNextParticipationAction,
} from '@/lib/v2/data/supporters'
import { resolveV2HostCapabilities } from '@/lib/v2/hostAccess'
import {
  fetchLiveSessions,
  fetchRecentCompletedRecaps,
  fetchRecentRoomActivity,
} from '@/lib/v2/data/streamEngine'
import type { CommunityPersonalization, V2Circle, V2Session } from '@/lib/v2/types'

export type { CommunityPersonalization } from '@/lib/v2/types'

const EMPTY_PERSONALIZATION_EXTRAS = {
  supporterScore: EMPTY_SCORE,
  badges: [],
  participationHistory: [],
  suggestedAction: null,
  activityEvidenceAvailable: false,
  hostCta: null as CommunityPersonalization['hostCta'],
  hostAccess: null,
}

export async function fetchCommunityPersonalization(): Promise<CommunityPersonalization> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const { sessions } = await fetchCommunitySessions()
  const upcomingSessions = sessions.filter(s => s.status !== 'ended').slice(0, 4)
  const liveSessions = await fetchLiveSessions()

  if (!user) {
    const { circles } = await fetchCommunityCircles()
    return {
      userId: null,
      myCircles: [],
      joinedSessions: [],
      mySubmissions: [],
      recommendedCircles: circles.filter(c => c.featured).slice(0, 4),
      feedbackReceivedCount: 0,
      upcomingSessions,
      liveSessions,
      recentCompletedSessions: [],
      recentRoomActivity: await fetchRecentRoomActivity(),
      myParticipationSummary: { sessionsJoined: 0, sessionsListened: 0, playlistSubmissions: 0 },
      ...EMPTY_PERSONALIZATION_EXTRAS,
    }
  }

  const { data: userSongs } = await supabase.from('songs').select('id').eq('user_id', user.id)
  const songIds = (userSongs || []).map(s => s.id)

  const [
    { data: memberships },
    { data: participations },
    { data: artists },
    feedbackCountRes,
    participationCounts,
    activityEvidenceAvailable,
    participationHistory,
  ] = await Promise.all([
    supabase.from('v2_circle_members').select('circle_id, v2_circles(*)').eq('user_id', user.id).order('joined_at', { ascending: false }),
    supabase.from('v2_session_participation').select('session_id, v2_sessions(*, v2_circles(slug, name))').eq('user_id', user.id).eq('status', 'joined'),
    supabase.from('artists').select('genre').eq('user_id', user.id),
    songIds.length
      ? supabase.from('v2_song_feedback').select('id', { count: 'exact', head: true }).in('song_id', songIds)
      : Promise.resolve({ count: 0 }),
    fetchUserParticipationCounts(user.id),
    fetchActivityEvidenceAvailable(user.id),
    fetchUserParticipationHistory(user.id, 12),
  ])

  const supporterScore = {
    ...participationCounts,
    score: computeSupporterScore(participationCounts),
  }
  const badges = computeEarnedBadges(supporterScore)

  const myCircles: V2Circle[] = []
  for (const m of memberships || []) {
    const raw = (m as unknown as { v2_circles?: Record<string, unknown> | Record<string, unknown>[] }).v2_circles
    const row = Array.isArray(raw) ? raw[0] : raw
    if (row) myCircles.push({ ...mapCircleRow(row), isMember: true })
  }

  const joinedSessions: V2Session[] = []
  for (const p of participations || []) {
    const raw = (p as unknown as { v2_sessions?: Record<string, unknown> & { v2_circles?: { slug: string; name: string } | { slug: string; name: string }[] } }).v2_sessions
    const row = Array.isArray(raw) ? null : raw
    if (!row) continue
    const circleRaw = row.v2_circles
    const circle = Array.isArray(circleRaw) ? circleRaw[0] : circleRaw
    joinedSessions.push({ ...mapSessionRow(row, circle), userJoined: true })
  }

  const genres = Array.from(new Set((artists || []).map(a => (a.genre || '').toLowerCase()).filter(Boolean)))
  const { data: allCircles } = await supabase.from('v2_circles').select('*').eq('visibility', 'public').order('featured', { ascending: false })
  const memberIds = new Set(myCircles.map(c => c.id))
  const recommended = (allCircles || [])
    .filter(c => !memberIds.has(c.id as string))
    .sort((a, b) => {
      const aTags = ((a.tags as string[]) || []).join(' ').toLowerCase()
      const bTags = ((b.tags as string[]) || []).join(' ').toLowerCase()
      const aScore = genres.some(g => aTags.includes(g) || String(a.name).toLowerCase().includes(g)) ? 1 : 0
      const bScore = genres.some(g => bTags.includes(g) || String(b.name).toLowerCase().includes(g)) ? 1 : 0
      return bScore - aScore
    })
    .slice(0, 4)
    .map(r => mapCircleRow(r as Record<string, unknown>))

  const [{ data: circleSubs }, { data: sessionSubs }, { data: playlistSubs }] = await Promise.all([
    supabase.from('v2_circle_songs').select('id, status, created_at, songs(title), v2_circles(name)').eq('submitted_by', user.id).order('created_at', { ascending: false }).limit(12),
    supabase.from('v2_session_songs').select('id, status, created_at, title, artist_name, v2_sessions(title)').eq('submitted_by', user.id).order('created_at', { ascending: false }).limit(12),
    supabase.from('v2_playlist_room_items').select('id, created_at, title, artist_name, v2_playlist_rooms(name)').eq('submitted_by', user.id).order('created_at', { ascending: false }).limit(12),
  ])

  const mySubmissions = [
    ...(circleSubs || []).map(r => ({
      id: r.id as string,
      title: (r as { songs?: { title?: string } }).songs?.title || 'Song',
      artistName: '',
      targetType: 'circle' as const,
      targetLabel: (r as { v2_circles?: { name?: string } }).v2_circles?.name || 'Circle',
      status: r.status as 'pending' | 'approved' | 'removed',
      createdAt: r.created_at as string,
    })),
    ...(sessionSubs || []).map(r => ({
      id: r.id as string,
      title: r.title as string,
      artistName: r.artist_name as string,
      targetType: 'session' as const,
      targetLabel: (r as { v2_sessions?: { title?: string } }).v2_sessions?.title || 'Session',
      status: (r.status || 'pending') as 'pending' | 'approved' | 'removed',
      createdAt: r.created_at as string,
    })),
    ...(playlistSubs || []).map(r => ({
      id: r.id as string,
      title: r.title as string,
      artistName: r.artist_name as string,
      targetType: 'playlist' as const,
      targetLabel: (r as { v2_playlist_rooms?: { name?: string } }).v2_playlist_rooms?.name || 'Playlist room',
      status: 'approved' as const,
      createdAt: r.created_at as string,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12)

  const { circles } = await fetchCommunityCircles()
  const [recentCompletedSessions, recentRoomActivity] = await Promise.all([
    fetchRecentCompletedRecaps(3),
    fetchRecentRoomActivity(),
  ])

  const firstLive = liveSessions[0]
  const hostAccess = await resolveV2HostCapabilities(supabase, user.id)
  const hostCta = hostAccess.isExistingHost ? 'dashboard' as const : 'become_host' as const
  const suggestedAction = suggestNextParticipationAction({
    score: supporterScore,
    liveSessionId: firstLive?.id,
    liveSessionTitle: firstLive?.title,
    hasOpenFeedback: (feedbackCountRes.count || 0) === 0 && supporterScore.sessionsListened >= 1,
  })

  return {
    userId: user.id,
    myCircles,
    joinedSessions,
    mySubmissions,
    recommendedCircles: recommended.length ? recommended : circles.filter(c => c.featured).slice(0, 4),
    feedbackReceivedCount: feedbackCountRes.count || 0,
    upcomingSessions,
    liveSessions,
    recentCompletedSessions,
    recentRoomActivity,
    myParticipationSummary: {
      sessionsJoined: supporterScore.sessionsJoined,
      sessionsListened: supporterScore.sessionsListened,
      playlistSubmissions: (playlistSubs || []).length,
    },
    supporterScore,
    badges,
    participationHistory,
    suggestedAction,
    activityEvidenceAvailable,
    hostCta,
    hostAccess,
  }
}
