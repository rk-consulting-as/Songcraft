import { createServerSupabase } from '@/lib/supabase/server'
import { fetchPlaylistRoomParticipationCount, fetchPlaylistRoomSupporters } from '@/lib/v2/data/supporters'
import { mapSessionRow } from '@/lib/v2/data/community'
import type {
  V2PlaylistRoomActivity,
  V2Session,
  V2SessionParticipant,
  V2SessionPlayLog,
  V2SessionRecap,
} from '@/lib/v2/types'

type StreamMeta = { host_notes?: string[]; completed_at?: string }

export async function fetchSessionPlayLogs(sessionId: string): Promise<V2SessionPlayLog[]> {
  const supabase = createServerSupabase()
  const { data: rows } = await supabase
    .from('v2_session_play_logs')
    .select('id, session_id, session_song_id, song_id, played_by, played_at, source, note, v2_session_songs(title, artist_name)')
    .eq('session_id', sessionId)
    .order('played_at', { ascending: false })
    .limit(50)

  if (!rows?.length) return []

  const playerIds = Array.from(new Set(rows.map(r => r.played_by)))
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', playerIds)
  const names = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Host']))

  return rows.map(r => {
    const song = (r as { v2_session_songs?: { title?: string; artist_name?: string } | null }).v2_session_songs
    return {
      id: r.id,
      sessionId: r.session_id,
      sessionSongId: r.session_song_id ?? undefined,
      songId: r.song_id ?? undefined,
      title: song?.title || 'Track',
      artistName: song?.artist_name || '',
      playedByName: names[r.played_by] || 'Host',
      playedAt: r.played_at,
      source: (r.source || 'manual_host') as V2SessionPlayLog['source'],
      note: r.note ?? undefined,
    }
  })
}

export async function fetchSessionParticipants(sessionId: string): Promise<V2SessionParticipant[]> {
  const supabase = createServerSupabase()
  const { data: rows } = await supabase
    .from('v2_session_participation')
    .select('id, user_id, status, joined_at, listened_at, participation_note')
    .eq('session_id', sessionId)
    .eq('status', 'joined')
    .order('joined_at', { ascending: false })

  if (!rows?.length) return []

  const ids = rows.map(r => r.user_id)
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', ids)
  const names = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Member']))

  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    displayName: names[r.user_id] || 'Member',
    status: r.status as V2SessionParticipant['status'],
    joinedAt: r.joined_at,
    listenedAt: r.listened_at ?? undefined,
    note: r.participation_note ?? undefined,
  }))
}

export function parseStreamMeta(raw: unknown): StreamMeta {
  if (!raw || typeof raw !== 'object') return {}
  const m = raw as StreamMeta
  return { host_notes: Array.isArray(m.host_notes) ? m.host_notes : [], completed_at: m.completed_at }
}

export async function fetchSessionRecap(sessionId: string, title: string): Promise<V2SessionRecap> {
  const supabase = createServerSupabase()
  const [playLogs, participants, feedbackCountRes, sessionRow] = await Promise.all([
    fetchSessionPlayLogs(sessionId),
    fetchSessionParticipants(sessionId),
    supabase.from('v2_song_feedback').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
    supabase.from('v2_sessions').select('stream_engine_meta').eq('id', sessionId).maybeSingle(),
  ])

  const meta = parseStreamMeta(sessionRow.data?.stream_engine_meta)
  const listenedCount = participants.filter(p => p.listenedAt).length

  const supporterMap: Record<string, number> = {}
  for (const p of participants) {
    if (p.listenedAt || p.note) {
      supporterMap[p.displayName] = (supporterMap[p.displayName] || 0) + 1
    }
  }
  const topSupporters = Object.entries(supporterMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    sessionId,
    title,
    songsPlayed: playLogs.reverse(),
    participantCount: participants.length,
    listenedCount,
    feedbackCount: feedbackCountRes.count || 0,
    topSupporters,
    hostNotes: meta.host_notes || [],
    completedAt: meta.completed_at,
  }
}

export async function fetchLiveSessions(): Promise<V2Session[]> {
  const supabase = createServerSupabase()
  const { data } = await supabase
    .from('v2_sessions')
    .select('*, v2_circles(slug, name)')
    .eq('status', 'live')
    .order('starts_at', { ascending: false })
    .limit(8)

  return (data || []).map(row => {
    const circleRaw = (row as { v2_circles?: { slug: string; name: string } | { slug: string; name: string }[] }).v2_circles
    const circle = Array.isArray(circleRaw) ? circleRaw[0] : circleRaw
    return mapSessionRow(row as Record<string, unknown>, circle)
  })
}

export async function fetchRecentCompletedRecaps(limit = 4): Promise<V2SessionRecap[]> {
  const supabase = createServerSupabase()
  const { data: sessions } = await supabase
    .from('v2_sessions')
    .select('id, title')
    .eq('status', 'ended')
    .order('updated_at', { ascending: false })
    .limit(limit)

  const recaps: V2SessionRecap[] = []
  for (const s of sessions || []) {
    recaps.push(await fetchSessionRecap(s.id, s.title))
  }
  return recaps
}

export async function fetchPlaylistRoomActivity(roomId: string, circleId?: string): Promise<V2PlaylistRoomActivity> {
  const supabase = createServerSupabase()

  const [{ data: room }, { data: items }, { data: sessions }] = await Promise.all([
    supabase.from('v2_playlist_rooms').select('round_status, last_completed_at').eq('id', roomId).maybeSingle(),
    supabase
      .from('v2_playlist_room_items')
      .select('id, title, artist_name, created_at, played_at, submitted_by')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(24),
    circleId
      ? supabase.from('v2_sessions').select('id, title, status').eq('circle_id', circleId).order('starts_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const allItems = items || []
  const recentSubmissions = allItems
    .filter(i => !i.played_at)
    .slice(0, 8)
    .map(i => ({ id: i.id, title: i.title, artistName: i.artist_name || '', createdAt: i.created_at }))

  const lastPlayed = allItems
    .filter(i => i.played_at)
    .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
    .slice(0, 5)
    .map(i => ({ id: i.id, title: i.title, artistName: i.artist_name || '', playedAt: i.played_at as string }))

  const listenedCount = allItems.filter(i => i.played_at).length
  const participationCount = await fetchPlaylistRoomParticipationCount(roomId)
  const { recent: recentSupporters, topThisWeek: topSupportersThisWeek } = await fetchPlaylistRoomSupporters(roomId)

  return {
    recentSubmissions,
    lastPlayed,
    listenedCount,
    participationCount,
    roundStatus: (room?.round_status as 'active' | 'completed') || 'active',
    lastCompletedAt: room?.last_completed_at ?? undefined,
    linkedSessions: (sessions || []).map(s => ({
      id: s.id,
      title: s.title,
      status: s.status as V2Session['status'],
    })),
    recentSupporters,
    topSupportersThisWeek,
  }
}

export async function fetchRecentRoomActivity(): Promise<{ roomSlug: string; roomName: string; lastPlayedTitle?: string; roundStatus: string }[]> {
  const supabase = createServerSupabase()
  const { data: rooms } = await supabase
    .from('v2_playlist_rooms')
    .select('id, slug, name, round_status')
    .order('updated_at', { ascending: false })
    .limit(6)

  const out: { roomSlug: string; roomName: string; lastPlayedTitle?: string; roundStatus: string }[] = []
  for (const room of rooms || []) {
    const { data: last } = await supabase
      .from('v2_playlist_room_items')
      .select('title')
      .eq('room_id', room.id)
      .not('played_at', 'is', null)
      .order('played_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    out.push({
      roomSlug: room.slug,
      roomName: room.name,
      lastPlayedTitle: last?.title,
      roundStatus: room.round_status || 'active',
    })
  }
  return out
}
