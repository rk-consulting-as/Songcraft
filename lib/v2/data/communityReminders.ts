import { createServerSupabase } from '@/lib/supabase/server'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2CommunityReminder, V2HostDashboard } from '@/lib/v2/types'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Read-time reminders for the current user. These are computed on read (no cron,
 * no stored rows) and surface actionable "next steps" on the community home.
 */
export async function fetchCommunityReminders(): Promise<V2CommunityReminder[]> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const reminders: V2CommunityReminder[] = []

  const [{ data: participations }, { data: memberships }, { data: mySessionSubs }] = await Promise.all([
    supabase
      .from('v2_session_participation')
      .select('session_id, listened_at, v2_sessions(id, title, status)')
      .eq('user_id', user.id)
      .eq('status', 'joined'),
    supabase.from('v2_circle_members').select('circle_id').eq('user_id', user.id),
    supabase
      .from('v2_session_songs')
      .select('id, title, status, session_id, v2_sessions(title)')
      .eq('submitted_by', user.id)
      .eq('status', 'pending')
      .limit(5),
  ])

  // 1) Live session I joined
  const liveJoined = (participations || []).find(p => {
    const s = (p as { v2_sessions?: { status?: string } }).v2_sessions
    return s?.status === 'live'
  })
  if (liveJoined) {
    const s = (liveJoined as { v2_sessions?: { id?: string; title?: string } }).v2_sessions
    reminders.push({
      id: `live-${s?.id}`,
      kind: 'session_live_now',
      icon: '●',
      tone: 'attention',
      title: `“${s?.title || 'A session'}” is live now`,
      body: 'Join the room and listen along.',
      cta: { label: 'Join now', href: V2_ROUTES.session(String(s?.id)) },
    })
  }

  // 2) Joined session (live or ended) with no listening confirmation
  const needsParticipation = (participations || []).find(p => {
    const s = (p as { v2_sessions?: { status?: string } }).v2_sessions
    return !p.listened_at && (s?.status === 'live' || s?.status === 'ended')
  })
  if (needsParticipation) {
    const s = (needsParticipation as { v2_sessions?: { id?: string; title?: string } }).v2_sessions
    reminders.push({
      id: `participate-${s?.id}`,
      kind: 'session_needs_participation',
      icon: '👂',
      tone: 'attention',
      title: 'You have a session waiting for participation',
      body: `Confirm you listened in “${s?.title || 'a session'}”.`,
      cta: { label: 'Confirm listening', href: V2_ROUTES.session(String(s?.id)) },
    })
  }

  // 3) My pending session submission
  const pending = (mySessionSubs || [])[0]
  if (pending) {
    const s = (pending as { v2_sessions?: { title?: string } }).v2_sessions
    reminders.push({
      id: `pending-${pending.id}`,
      kind: 'submission_pending',
      icon: '⧗',
      tone: 'info',
      title: 'Your song is still pending in a session',
      body: `“${pending.title}” is awaiting host review for “${s?.title || 'a session'}”.`,
      cta: { label: 'View session', href: V2_ROUTES.session(String(pending.session_id)) },
    })
  }

  // 4) A song in one of my circles is waiting for feedback (someone else's, unrated by me)
  const circleIds = (memberships || []).map(m => m.circle_id as string)
  if (circleIds.length) {
    const { data: circleSongs } = await supabase
      .from('v2_circle_songs')
      .select('id, song_id, circle_id, submitted_by, status, v2_circles(slug, name)')
      .in('circle_id', circleIds)
      .eq('status', 'approved')
      .neq('submitted_by', user.id)
      .limit(10)

    if (circleSongs && circleSongs.length) {
      const songIds = circleSongs.map(r => r.song_id).filter(Boolean) as string[]
      const { data: myFeedback } = songIds.length
        ? await supabase
          .from('v2_song_feedback')
          .select('song_id')
          .eq('from_user_id', user.id)
          .in('song_id', songIds)
        : { data: [] }
      const reviewed = new Set((myFeedback || []).map(f => f.song_id))
      const waiting = circleSongs.find(r => !reviewed.has(r.song_id))
      if (waiting) {
        const circle = (waiting as { v2_circles?: { slug?: string; name?: string } }).v2_circles
        reminders.push({
          id: `feedback-${waiting.id}`,
          kind: 'feedback_needed',
          icon: '💬',
          tone: 'attention',
          title: 'A song in one of your circles needs feedback',
          body: circle?.name ? `Help out in “${circle.name}”.` : 'Share a rating or a quick note.',
          cta: { label: 'Give feedback', href: circle?.slug ? V2_ROUTES.circle(circle.slug) : V2_ROUTES.circles },
        })
      }
    }
  }

  // 5) Playlist room I participated in had recent activity
  const { data: roomParticipation } = await supabase
    .from('v2_playlist_room_participation')
    .select('room_id, v2_playlist_rooms(slug, name, round_status, last_completed_at)')
    .eq('user_id', user.id)
    .limit(10)

  const now = Date.now()
  const recentRoom = (roomParticipation || []).find(rp => {
    const room = (rp as { v2_playlist_rooms?: { last_completed_at?: string } }).v2_playlist_rooms
    if (!room?.last_completed_at) return false
    return now - new Date(room.last_completed_at).getTime() < WEEK_MS
  })
  if (recentRoom) {
    const room = (recentRoom as { v2_playlist_rooms?: { slug?: string; name?: string } }).v2_playlist_rooms
    reminders.push({
      id: `room-${room?.slug}`,
      kind: 'room_activity',
      icon: '♫',
      tone: 'info',
      title: 'A playlist room you joined had activity this week',
      body: room?.name ? `New rounds in “${room.name}”.` : 'Catch up on recent listening rounds.',
      cta: { label: 'Open room', href: room?.slug ? V2_ROUTES.playlistRoom(room.slug) : V2_ROUTES.playlists },
    })
  }

  return reminders.slice(0, 5)
}

/**
 * Host-facing reminders derived purely from the already-fetched dashboard —
 * no extra queries, no cron. Reuses the same reminder model.
 */
export function computeHostReminders(dashboard: V2HostDashboard): V2CommunityReminder[] {
  const reminders: V2CommunityReminder[] = []
  const { pendingSubmissions, sessions, playlistRooms, recentParticipation } = dashboard

  if (pendingSubmissions.length) {
    const first = pendingSubmissions[0]
    reminders.push({
      id: 'host-pending',
      kind: 'host_submission_pending',
      icon: '⧗',
      tone: 'attention',
      title: `${pendingSubmissions.length} submission${pendingSubmissions.length > 1 ? 's' : ''} waiting for review`,
      body: `Latest: “${first.title}” for “${first.sessionTitle}”.`,
      cta: { label: 'Review submissions', href: V2_ROUTES.session(first.sessionId) },
    })
  }

  // Live session with no confirmed participants yet
  const participationBySession = new Map(recentParticipation.map(p => [p.sessionId, p]))
  const liveNoParticipants = sessions.find(s => {
    if (s.status !== 'live') return false
    const p = participationBySession.get(s.id)
    return !p || p.participantCount === 0
  })
  if (liveNoParticipants) {
    reminders.push({
      id: `host-empty-${liveNoParticipants.id}`,
      kind: 'host_session_no_participants',
      icon: '👤',
      tone: 'attention',
      title: `“${liveNoParticipants.title}” is live with no participants yet`,
      body: 'Share the session link or invite your circle to join.',
      cta: { label: 'Open session', href: V2_ROUTES.session(liveNoParticipants.id) },
    })
  }

  // Upcoming session starting within 48h
  const now = Date.now()
  const soon = sessions.find(s => {
    if (s.status !== 'upcoming') return false
    const t = new Date(s.startsAt).getTime()
    return t > now && t - now < 48 * 60 * 60 * 1000
  })
  if (soon) {
    reminders.push({
      id: `host-soon-${soon.id}`,
      kind: 'host_session_soon',
      icon: '◷',
      tone: 'info',
      title: `“${soon.title}” starts soon`,
      body: 'Approve the queue and get ready to go live.',
      cta: { label: 'Prepare session', href: V2_ROUTES.session(soon.id) },
    })
  }

  // Playlist room with an active round
  const activeRoom = playlistRooms.find(r => r.roundStatus === 'active' && r.trackCount > 0)
  if (activeRoom) {
    reminders.push({
      id: `host-room-${activeRoom.slug}`,
      kind: 'host_room_new_songs',
      icon: '♫',
      tone: 'info',
      title: `“${activeRoom.name}” has an active listening round`,
      body: 'Mark songs played and complete the round when done.',
      cta: { label: 'Open room', href: V2_ROUTES.playlistRoom(activeRoom.slug) },
    })
  }

  return reminders.slice(0, 6)
}
