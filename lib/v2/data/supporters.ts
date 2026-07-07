import { createServerSupabase } from '@/lib/supabase/server'
import { computeEarnedBadges, computeSupporterScore, primaryBadgeLabel } from '@/lib/v2/badges'
import { v2ServiceClient } from '@/lib/v2/apiAuth'
import { V2_ROUTES } from '@/lib/v2/routes'
import type {
  V2CommunityProfileCard,
  V2ParticipationHistoryItem,
  V2SuggestedParticipationAction,
  V2Supporter,
  V2SupporterScoreSummary,
} from '@/lib/v2/types'

const EMPTY_SCORE: V2SupporterScoreSummary = {
  score: 0,
  sessionsJoined: 0,
  sessionsListened: 0,
  feedbackGiven: 0,
  songsSupported: 0,
  playlistRoomParticipation: 0,
  circlesJoined: 0,
}

type RawCounts = Omit<V2SupporterScoreSummary, 'score'>

async function fetchProfileName(sb: ReturnType<typeof v2ServiceClient>, userId: string): Promise<{ displayName: string; avatarInitial: string }> {
  const { data } = await sb.from('profiles').select('display_name').eq('id', userId).maybeSingle()
  const displayName = data?.display_name?.trim() || 'Community member'
  return { displayName, avatarInitial: displayName.charAt(0).toUpperCase() || '?' }
}

export async function fetchUserParticipationCounts(userId: string, sb = v2ServiceClient()): Promise<RawCounts> {
  const [
    sessionsJoinedRes,
    sessionsListenedRes,
    feedbackGivenRes,
    circleSongsRes,
    sessionSongsRes,
    playlistItemsRes,
    playlistListenedRes,
    circlesJoinedRes,
  ] = await Promise.all([
    sb.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'joined'),
    sb.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('listened_at', 'is', null),
    sb.from('v2_song_feedback').select('id', { count: 'exact', head: true }).eq('from_user_id', userId),
    sb.from('v2_circle_songs').select('id', { count: 'exact', head: true }).eq('submitted_by', userId),
    sb.from('v2_session_songs').select('id', { count: 'exact', head: true }).eq('submitted_by', userId),
    sb.from('v2_playlist_room_items').select('id', { count: 'exact', head: true }).eq('submitted_by', userId),
    sb.from('v2_playlist_room_participation').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('v2_circle_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const songsSupported =
    (circleSongsRes.count || 0) + (sessionSongsRes.count || 0) + (playlistItemsRes.count || 0)

  return {
    sessionsJoined: sessionsJoinedRes.count || 0,
    sessionsListened: sessionsListenedRes.count || 0,
    feedbackGiven: feedbackGivenRes.count || 0,
    songsSupported,
    playlistRoomParticipation: playlistListenedRes.count || 0,
    circlesJoined: circlesJoinedRes.count || 0,
  }
}

export async function fetchUserSupporterScore(userId: string): Promise<V2SupporterScoreSummary> {
  const counts = await fetchUserParticipationCounts(userId)
  const score = computeSupporterScore(counts)
  return { ...counts, score }
}

export async function fetchUserCommunityProfile(userId: string): Promise<V2CommunityProfileCard> {
  const sb = v2ServiceClient()
  const [scoreSummary, { displayName, avatarInitial }, activityEvidenceAvailable] = await Promise.all([
    fetchUserSupporterScore(userId),
    fetchProfileName(sb, userId),
    fetchActivityEvidenceAvailable(userId, sb),
  ])
  const badges = computeEarnedBadges(scoreSummary)
  return { userId, displayName, avatarInitial, scoreSummary, badges, activityEvidenceAvailable }
}

export async function fetchActivityEvidenceAvailable(
  userId: string,
  sb = v2ServiceClient(),
): Promise<boolean> {
  const [{ data: profile }, { count: logCount }] = await Promise.all([
    sb.from('profiles').select('lastfm_username').eq('id', userId).maybeSingle(),
    sb.from('campaign_activity_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).limit(1),
  ])
  return !!(profile?.lastfm_username?.trim()) || (logCount || 0) > 0
}

export async function fetchUserParticipationHistory(userId: string, limit = 24): Promise<V2ParticipationHistoryItem[]> {
  const sb = v2ServiceClient()

  const [
    { data: joined },
    { data: listened },
    { data: feedback },
    { data: circleSubs },
    { data: sessionSubs },
    { data: playlistListened },
  ] = await Promise.all([
    sb
      .from('v2_session_participation')
      .select('id, joined_at, v2_sessions(id, title)')
      .eq('user_id', userId)
      .eq('status', 'joined')
      .order('joined_at', { ascending: false })
      .limit(limit),
    sb
      .from('v2_session_participation')
      .select('id, listened_at, participation_note, v2_sessions(id, title)')
      .eq('user_id', userId)
      .not('listened_at', 'is', null)
      .order('listened_at', { ascending: false })
      .limit(limit),
    sb
      .from('v2_song_feedback')
      .select('id, created_at, rating, reaction, songs(title)')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    sb
      .from('v2_circle_songs')
      .select('id, created_at, songs(title), v2_circles(name)')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    sb
      .from('v2_session_songs')
      .select('id, created_at, title, v2_sessions(title)')
      .eq('submitted_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
    sb
      .from('v2_playlist_room_participation')
      .select('id, listened_at, v2_playlist_rooms(slug, name)')
      .eq('user_id', userId)
      .order('listened_at', { ascending: false })
      .limit(limit),
  ])

  const items: V2ParticipationHistoryItem[] = []

  for (const row of joined || []) {
    const session = extractJoin(row, 'v2_sessions') as { id?: string; title?: string } | null
    items.push({
      id: `join-${row.id}`,
      type: 'session_joined',
      title: session?.title || 'Session',
      subtitle: 'Joined listening session',
      at: row.joined_at as string,
      href: session?.id ? V2_ROUTES.session(session.id) : undefined,
    })
  }

  for (const row of listened || []) {
    const session = extractJoin(row, 'v2_sessions') as { id?: string; title?: string } | null
    items.push({
      id: `listened-${row.id}`,
      type: 'session_listened',
      title: session?.title || 'Session',
      subtitle: row.participation_note ? `Listened — ${row.participation_note}` : 'Listening confirmed',
      at: row.listened_at as string,
      href: session?.id ? V2_ROUTES.session(session.id) : undefined,
    })
  }

  for (const row of feedback || []) {
    const song = (row as { songs?: { title?: string } }).songs
    items.push({
      id: `feedback-${row.id}`,
      type: 'feedback',
      title: song?.title || 'Song feedback',
      subtitle: row.rating ? `Rating ${row.rating}/5` : 'Community feedback',
      at: row.created_at as string,
    })
  }

  for (const row of circleSubs || []) {
    const song = (row as { songs?: { title?: string } }).songs
    const circle = (row as { v2_circles?: { name?: string } }).v2_circles
    items.push({
      id: `circle-song-${row.id}`,
      type: 'song_submission',
      title: song?.title || 'Song submission',
      subtitle: circle?.name ? `Submitted to ${circle.name}` : 'Circle submission',
      at: row.created_at as string,
    })
  }

  for (const row of sessionSubs || []) {
    const session = (row as { v2_sessions?: { title?: string } }).v2_sessions
    items.push({
      id: `session-song-${row.id}`,
      type: 'song_submission',
      title: row.title as string,
      subtitle: session?.title ? `Submitted to ${session.title}` : 'Session submission',
      at: row.created_at as string,
    })
  }

  for (const row of playlistListened || []) {
    const room = extractJoin(row, 'v2_playlist_rooms') as { slug?: string; name?: string } | null
    items.push({
      id: `playlist-${row.id}`,
      type: 'playlist_listened',
      title: room?.name || 'Playlist room',
      subtitle: 'Listening participation confirmed',
      at: row.listened_at as string,
      href: room?.slug ? V2_ROUTES.playlistRoom(room.slug) : undefined,
    })
  }

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

function extractJoin(row: Record<string, unknown>, key: string): unknown {
  const raw = row[key]
  return Array.isArray(raw) ? raw[0] : raw
}

async function scoreUsersInScope(
  userIds: string[],
  scope: 'circle' | 'room',
  scopeId: string,
): Promise<Map<string, number>> {
  const sb = v2ServiceClient()
  const scores = new Map<string, number>()
  for (const id of userIds) scores.set(id, 0)
  if (!userIds.length) return scores

  if (scope === 'circle') {
    const { data: sessionIds } = await sb.from('v2_sessions').select('id').eq('circle_id', scopeId)
    const ids = (sessionIds || []).map(s => s.id)

    if (ids.length) {
      const { data: parts } = await sb
        .from('v2_session_participation')
        .select('user_id, listened_at')
        .in('session_id', ids)
        .eq('status', 'joined')
        .in('user_id', userIds)
      for (const p of parts || []) {
        scores.set(p.user_id, (scores.get(p.user_id) || 0) + 8)
        if (p.listened_at) scores.set(p.user_id, (scores.get(p.user_id) || 0) + 12)
      }
    }

    const [{ data: feedback }, { data: subs }] = await Promise.all([
      sb.from('v2_song_feedback').select('from_user_id').eq('circle_id', scopeId).in('from_user_id', userIds),
      sb.from('v2_circle_songs').select('submitted_by').eq('circle_id', scopeId).in('submitted_by', userIds),
    ])
    for (const f of feedback || []) scores.set(f.from_user_id, (scores.get(f.from_user_id) || 0) + 15)
    for (const s of subs || []) {
      if (s.submitted_by) scores.set(s.submitted_by, (scores.get(s.submitted_by) || 0) + 10)
    }
  }

  if (scope === 'room') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: listened }, { data: subs }] = await Promise.all([
      sb
        .from('v2_playlist_room_participation')
        .select('user_id, listened_at')
        .eq('room_id', scopeId)
        .in('user_id', userIds),
      sb
        .from('v2_playlist_room_items')
        .select('submitted_by')
        .eq('room_id', scopeId)
        .in('submitted_by', userIds),
    ])
    for (const l of listened || []) {
      const pts = l.listened_at && l.listened_at >= weekAgo ? 20 : 10
      scores.set(l.user_id, (scores.get(l.user_id) || 0) + pts)
    }
    for (const s of subs || []) {
      if (s.submitted_by) scores.set(s.submitted_by, (scores.get(s.submitted_by) || 0) + 8)
    }
  }

  return scores
}

async function mapUserIdsToSupporters(userIds: string[], scoreMap: Map<string, number>, limit: number): Promise<V2Supporter[]> {
  const sb = v2ServiceClient()
  const sorted = userIds
    .map(id => ({ id, score: scoreMap.get(id) || 0 }))
    .filter(u => u.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  if (!sorted.length) return []

  const { data: profiles } = await sb.from('profiles').select('id, display_name').in('id', sorted.map(s => s.id))
  const names = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Member']))

  const supporters: V2Supporter[] = []
  for (const entry of sorted) {
    const scoreSummary = await fetchUserSupporterScore(entry.id)
    const badges = computeEarnedBadges(scoreSummary)
    supporters.push({
      id: entry.id,
      name: names[entry.id] || 'Member',
      score: entry.score,
      badge: primaryBadgeLabel(badges),
      badges,
    })
  }
  return supporters
}

export async function fetchCircleTopSupporters(circleId: string, limit = 5): Promise<V2Supporter[]> {
  const sb = v2ServiceClient()
  const { data: members } = await sb.from('v2_circle_members').select('user_id').eq('circle_id', circleId).limit(50)
  const userIds = (members || []).map(m => m.user_id)
  const scoreMap = await scoreUsersInScope(userIds, 'circle', circleId)
  return mapUserIdsToSupporters(userIds, scoreMap, limit)
}

export async function fetchPlaylistRoomSupporters(
  roomId: string,
  options?: { weekOnly?: boolean; limit?: number },
): Promise<{ recent: V2Supporter[]; topThisWeek: V2Supporter[] }> {
  const sb = v2ServiceClient()
  const limit = options?.limit ?? 5
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: recentRows }, { data: weekRows }, { data: submitters }] = await Promise.all([
    sb
      .from('v2_playlist_room_participation')
      .select('user_id, listened_at')
      .eq('room_id', roomId)
      .order('listened_at', { ascending: false })
      .limit(20),
    sb
      .from('v2_playlist_room_participation')
      .select('user_id, listened_at')
      .eq('room_id', roomId)
      .gte('listened_at', weekAgo),
    sb.from('v2_playlist_room_items').select('submitted_by').eq('room_id', roomId).not('submitted_by', 'is', null),
  ])

  const recentIds = Array.from(new Set((recentRows || []).map(r => r.user_id)))
  const weekIds = Array.from(new Set([
    ...(weekRows || []).map(r => r.user_id),
    ...(submitters || []).map(s => s.submitted_by).filter(Boolean) as string[],
  ]))

  const recentScoreMap = await scoreUsersInScope(recentIds, 'room', roomId)
  const weekScoreMap = await scoreUsersInScope(weekIds, 'room', roomId)

  const [recent, topThisWeek] = await Promise.all([
    mapUserIdsToSupporters(recentIds, recentScoreMap, limit),
    mapUserIdsToSupporters(weekIds, weekScoreMap, limit),
  ])

  return { recent, topThisWeek }
}

export function suggestNextParticipationAction(input: {
  score: V2SupporterScoreSummary
  liveSessionId?: string
  liveSessionTitle?: string
  hasOpenFeedback?: boolean
}): V2SuggestedParticipationAction | null {
  if (input.liveSessionId) {
    return {
      label: 'Join live session',
      href: V2_ROUTES.session(input.liveSessionId),
      reason: `${input.liveSessionTitle || 'A session'} is live — confirm your listening participation.`,
    }
  }
  if (input.score.sessionsJoined > 0 && input.score.sessionsListened < input.score.sessionsJoined) {
    return {
      label: 'Confirm listening',
      href: V2_ROUTES.participation,
      reason: 'You joined sessions but have not confirmed listening yet.',
    }
  }
  if (input.hasOpenFeedback) {
    return {
      label: 'Give feedback',
      href: V2_ROUTES.songs,
      reason: 'Creators in your circles are waiting for listener notes.',
    }
  }
  if (input.score.circlesJoined === 0) {
    return {
      label: 'Join a circle',
      href: V2_ROUTES.circles,
      reason: 'Start with a circle that matches your sound.',
    }
  }
  if (input.score.feedbackGiven === 0 && input.score.sessionsListened >= 1) {
    return {
      label: 'Leave feedback',
      href: V2_ROUTES.songs,
      reason: 'Share a rating or reaction after your last session.',
    }
  }
  return {
    label: 'Browse sessions',
    href: V2_ROUTES.sessions,
    reason: 'Find the next community listening room.',
  }
}

export async function fetchPlaylistRoomParticipationCount(roomId: string): Promise<number> {
  const { count } = await v2ServiceClient()
    .from('v2_playlist_room_participation')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
  return count || 0
}

export async function fetchUserPlaylistRoomListened(roomId: string, userId: string): Promise<boolean> {
  const supabase = createServerSupabase()
  const { data } = await supabase
    .from('v2_playlist_room_participation')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export { EMPTY_SCORE }
