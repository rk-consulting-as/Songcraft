import { createServerSupabase } from '@/lib/supabase/server'
import { mapSessionRow } from '@/lib/v2/data/community'
import { formatCalendarDateKey, formatCalendarDayLabel } from '@/lib/v2/format'
import { V2_SESSIONS } from '@/lib/v2/mockData'
import type { V2CalendarDayGroup, V2CalendarSession, V2CalendarView, V2RsvpStatus, V2SessionRsvpCounts } from '@/lib/v2/types'

export async function fetchSessionRsvpCounts(sessionId: string): Promise<V2SessionRsvpCounts> {
  const supabase = createServerSupabase()
  const [{ count: going }, { count: interested }] = await Promise.all([
    supabase.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('session_id', sessionId).eq('rsvp_status', 'going'),
    supabase.from('v2_session_participation').select('id', { count: 'exact', head: true }).eq('session_id', sessionId).eq('rsvp_status', 'interested'),
  ])
  const g = going || 0
  const i = interested || 0
  return { going: g, interested: i, total: g + i }
}

export async function fetchUserRsvpStatus(sessionId: string, userId: string): Promise<V2RsvpStatus | null> {
  const supabase = createServerSupabase()
  const { data } = await supabase
    .from('v2_session_participation')
    .select('rsvp_status')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
  const s = data?.rsvp_status
  if (s === 'going' || s === 'interested' || s === 'declined') return s
  return null
}

async function enrichSessions(
  rows: Record<string, unknown>[],
  userId: string | null,
): Promise<V2CalendarSession[]> {
  if (!rows.length) return []
  const supabase = createServerSupabase()
  const sessionIds = rows.map(r => String(r.id))

  const hostIds = Array.from(new Set(rows.map(r => r.host_user_id).filter(Boolean))) as string[]
  const [{ data: profiles }, rsvpData] = await Promise.all([
    hostIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', hostIds)
      : Promise.resolve({ data: [] }),
    userId && sessionIds.length
      ? supabase.from('v2_session_participation').select('session_id, rsvp_status').eq('user_id', userId).in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
  ])

  const hostNames = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Host']))
  const rsvpBySession = Object.fromEntries(
    (rsvpData.data || []).map(r => [r.session_id, r.rsvp_status as V2RsvpStatus | null]),
  )

  const enriched: V2CalendarSession[] = []
  for (const row of rows) {
    const circle = (row as { v2_circles?: { slug: string; name: string } }).v2_circles
    const hostName = hostNames[String(row.host_user_id)] || 'Host'
    const session = mapSessionRow(row, circle, hostName)
    const userRsvpStatus = userId ? (rsvpBySession[String(row.id)] ?? null) : null
    const isHosting = userId ? String(row.host_user_id) === userId : false
    enriched.push({ ...session, hostName, userRsvpStatus, isHosting })
  }
  return enriched
}

function groupByDate(sessions: V2CalendarSession[]): V2CalendarDayGroup[] {
  const map = new Map<string, V2CalendarSession[]>()
  for (const s of sessions) {
    const key = formatCalendarDateKey(s.startsAt, s.timezone)
    const list = map.get(key) || []
    list.push(s)
    map.set(key, list)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, list]) => ({
      dateKey,
      label: formatCalendarDayLabel(list[0]?.startsAt || dateKey, list[0]?.timezone),
      sessions: list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    }))
}

export async function fetchCalendarSessions(view: V2CalendarView = 'upcoming'): Promise<{
  groups: V2CalendarDayGroup[]
  fromMock: boolean
  userId: string | null
}> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase.from('v2_sessions').select('*, v2_circles(slug, name)')

  const now = new Date().toISOString()
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  if (view === 'upcoming') {
    query = query.in('status', ['upcoming', 'live']).gte('starts_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
  } else if (view === 'this_week') {
    query = query.gte('starts_at', now).lte('starts_at', weekEnd).neq('status', 'ended')
  } else if (view === 'my_sessions' && user) {
    const { data: rsvps } = await supabase
      .from('v2_session_participation')
      .select('session_id')
      .eq('user_id', user.id)
      .in('rsvp_status', ['going', 'interested'])
    const ids = (rsvps || []).map(r => r.session_id)
    if (!ids.length) return { groups: [], fromMock: false, userId: user.id }
    query = query.in('id', ids).neq('status', 'ended')
  } else if (view === 'hosting' && user) {
    query = query.eq('host_user_id', user.id).neq('status', 'ended')
  } else if (view === 'my_sessions' || view === 'hosting') {
    return { groups: [], fromMock: false, userId: user?.id || null }
  }

  const { data, error } = await query.order('starts_at', { ascending: true }).limit(64)

  if (error || !data?.length) {
    if (view === 'upcoming') {
      const mock = V2_SESSIONS.filter(s => s.status !== 'ended')
      const groups = groupByDate(mock.map(s => ({ ...s, hostName: s.hostName })))
      return { groups, fromMock: true, userId: user?.id || null }
    }
    return { groups: [], fromMock: !data?.length && !error, userId: user?.id || null }
  }

  const sessions = await enrichSessions(data as Record<string, unknown>[], user?.id || null)
  return { groups: groupByDate(sessions), fromMock: false, userId: user?.id || null }
}

/** Sessions for home scheduling blocks. */
export async function fetchHomeScheduleSessions(userId: string | null): Promise<{
  liveNow: V2CalendarSession[]
  startingSoon: V2CalendarSession[]
  thisWeek: V2CalendarSession[]
  myRsvps: V2CalendarSession[]
  hostingSoon: V2CalendarSession[]
}> {
  const empty = { liveNow: [], startingSoon: [], thisWeek: [], myRsvps: [], hostingSoon: [] }
  const supabase = createServerSupabase()
  const now = Date.now()
  const weekEnd = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  const soonEnd = new Date(now + 2 * 60 * 60 * 1000).toISOString()

  const { data: rows } = await supabase
    .from('v2_sessions')
    .select('*, v2_circles(slug, name)')
    .neq('status', 'ended')
    .gte('starts_at', new Date(now - 6 * 60 * 60 * 1000).toISOString())
    .lte('starts_at', weekEnd)
    .order('starts_at', { ascending: true })
    .limit(32)

  if (!rows?.length) return empty

  const sessions = await enrichSessions(rows as Record<string, unknown>[], userId)
  const liveNow = sessions.filter(s => s.status === 'live')
  const startingSoon = sessions.filter(s => s.status === 'upcoming' && s.startsAt <= soonEnd && new Date(s.startsAt).getTime() > now)
  const thisWeek = sessions.filter(s => s.status !== 'ended')
  const myRsvps = sessions.filter(s => s.userRsvpStatus === 'going' || s.userRsvpStatus === 'interested')
  const hostingSoon = userId ? sessions.filter(s => s.hostUserId === userId) : []

  return { liveNow, startingSoon, thisWeek, myRsvps, hostingSoon }
}

/** Host dashboard upcoming schedule. */
export async function fetchHostSchedule(userId: string): Promise<{
  thisWeek: V2CalendarSession[]
  undated: V2CalendarSession[]
  needsParticipants: V2CalendarSession[]
  startingSoon: V2CalendarSession[]
}> {
  const supabase = createServerSupabase()
  const now = Date.now()
  const weekEnd = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
  const soonEnd = new Date(now + 48 * 60 * 60 * 1000).toISOString()

  const { data: rows } = await supabase
    .from('v2_sessions')
    .select('*, v2_circles(slug, name)')
    .eq('host_user_id', userId)
    .neq('status', 'ended')
    .order('starts_at', { ascending: true })
    .limit(24)

  const sessions = await enrichSessions((rows || []) as Record<string, unknown>[], userId)

  const thisWeek = sessions.filter(s => {
    const t = new Date(s.startsAt).getTime()
    return t >= now && t <= new Date(weekEnd).getTime()
  })

  const undated = sessions.filter(s => {
    const t = new Date(s.startsAt).getTime()
    return Number.isNaN(t) || t < now - 86400000 * 365
  })

  const startingSoon = sessions.filter(s => s.status === 'upcoming' && s.startsAt <= soonEnd && new Date(s.startsAt).getTime() > now)

  const needsParticipants: V2CalendarSession[] = []
  for (const s of sessions.filter(x => x.status === 'live' || (x.status === 'upcoming' && new Date(x.startsAt).getTime() > now))) {
    const counts = await fetchSessionRsvpCounts(s.id)
    s.rsvpCounts = counts
    if (counts.total === 0 && s.joinedCount === 0) needsParticipants.push(s)
  }

  return { thisWeek, undated, needsParticipants, startingSoon }
}
