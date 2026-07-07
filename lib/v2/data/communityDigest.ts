import { createServerSupabase } from '@/lib/supabase/server'
import type { V2WeeklyDigest } from '@/lib/v2/types'

const EMPTY_DIGEST: V2WeeklyDigest = {
  hasActivity: false,
  sessionsJoined: 0,
  listeningConfirmations: 0,
  feedbackGiven: 0,
  songsSupported: 0,
  playlistRoomParticipation: 0,
}

/**
 * "This week in your community" — computed on read from existing v2 tables.
 * Covers the last 7 days. No cron required.
 */
export async function fetchWeeklyDigest(): Promise<V2WeeklyDigest> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return EMPTY_DIGEST

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    sessionsJoinedRes,
    listenedRes,
    feedbackRes,
    circleSubsRes,
    sessionSubsRes,
    playlistSubsRes,
    roomParticipationRes,
    badgeRes,
  ] = await Promise.all([
    supabase.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'joined').gte('joined_at', since),
    supabase.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('listened_at', 'is', null).gte('listened_at', since),
    supabase.from('v2_song_feedback').select('id', { count: 'exact', head: true }).eq('from_user_id', user.id).gte('created_at', since),
    supabase.from('v2_circle_songs').select('id', { count: 'exact', head: true }).eq('submitted_by', user.id).gte('created_at', since),
    supabase.from('v2_session_songs').select('id', { count: 'exact', head: true }).eq('submitted_by', user.id).gte('created_at', since),
    supabase.from('v2_playlist_room_items').select('id', { count: 'exact', head: true }).eq('submitted_by', user.id).gte('created_at', since),
    supabase.from('v2_playlist_room_participation').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('listened_at', since),
    supabase
      .from('v2_community_notifications')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('kind', 'supporter_badge_earned')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const sessionsJoined = sessionsJoinedRes.count || 0
  const listeningConfirmations = listenedRes.count || 0
  const feedbackGiven = feedbackRes.count || 0
  const songsSupported = (circleSubsRes.count || 0) + (sessionSubsRes.count || 0) + (playlistSubsRes.count || 0)
  const playlistRoomParticipation = roomParticipationRes.count || 0
  const badgeEarnedThisWeek = (badgeRes.data?.[0]?.metadata as { badgeLabel?: string } | undefined)?.badgeLabel

  const hasActivity =
    sessionsJoined + listeningConfirmations + feedbackGiven + songsSupported + playlistRoomParticipation > 0
    || !!badgeEarnedThisWeek

  return {
    hasActivity,
    sessionsJoined,
    listeningConfirmations,
    feedbackGiven,
    songsSupported,
    playlistRoomParticipation,
    badgeEarnedThisWeek,
  }
}
