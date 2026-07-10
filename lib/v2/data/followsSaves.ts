import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabase } from '@/lib/supabase/server'
import { v2ServiceClient } from '@/lib/v2/apiAuth'
import { mapCircleRow, mapSessionRow } from '@/lib/v2/data/community'
import { isPublicCircleVisibility } from '@/lib/v2/publicVisibility'
import type { PlatformTag, V2Circle, V2PlaylistRoom, V2Session } from '@/lib/v2/types'

export type V2FollowSaveLibrary = {
  followedCircles: V2Circle[]
  followedHosts: { id: string; displayName: string; avatarUrl?: string; followerCount: number }[]
  savedSessions: V2Session[]
  savedRooms: V2PlaylistRoom[]
  myRsvpSessions: V2Session[]
}

export async function fetchUserFollowSaveLibrary(userId: string): Promise<V2FollowSaveLibrary> {
  const sb = createServerSupabase()

  const [{ data: circleFollows }, { data: hostFollows }, { data: saved }] = await Promise.all([
    sb.from('v2_circle_follows').select('circle_id, v2_circles(*)').eq('user_id', userId).order('created_at', { ascending: false }),
    sb.from('v2_host_follows').select('host_user_id').eq('user_id', userId).order('created_at', { ascending: false }),
    sb.from('v2_saved_community_items').select('entity_type, entity_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ])

  const followedCircles: V2Circle[] = []
  for (const row of circleFollows || []) {
    const raw = (row as unknown as { v2_circles?: Record<string, unknown> | Record<string, unknown>[] }).v2_circles
    const c = Array.isArray(raw) ? raw[0] : raw
    if (c) followedCircles.push(mapCircleRow(c))
  }

  const hostIds = (hostFollows || []).map(r => r.host_user_id as string)
  let followedHosts: V2FollowSaveLibrary['followedHosts'] = []
  if (hostIds.length) {
    const { data: profiles } = await sb.from('profiles').select('id, display_name, avatar_url').in('id', hostIds)
    const service = v2ServiceClient()
    const counts = await Promise.all(hostIds.map(async id => {
      const { count } = await service.from('v2_host_follows').select('id', { count: 'exact', head: true }).eq('host_user_id', id)
      return [id, count || 0] as const
    }))
    const countMap = Object.fromEntries(counts)
    followedHosts = (profiles || []).map(p => ({
      id: p.id,
      displayName: p.display_name || 'Host',
      avatarUrl: p.avatar_url || undefined,
      followerCount: countMap[p.id] || 0,
    }))
  }

  const sessionIds = (saved || []).filter(s => s.entity_type === 'session').map(s => s.entity_id as string)
  const roomIds = (saved || []).filter(s => s.entity_type === 'playlist_room').map(s => s.entity_id as string)

  let savedSessions: V2Session[] = []
  if (sessionIds.length) {
    const { data: rows } = await sb
      .from('v2_sessions')
      .select('*, v2_circles(slug, name, visibility)')
      .in('id', sessionIds)
    savedSessions = (rows || [])
      .filter(r => {
        const c = (r as { v2_circles?: { visibility?: string } }).v2_circles
        return !c || isPublicCircleVisibility(c.visibility)
      })
      .map(r => {
        const circle = (r as { v2_circles?: { slug: string; name: string } }).v2_circles
        return mapSessionRow(r as Record<string, unknown>, circle)
      })
  }

  let savedRooms: V2PlaylistRoom[] = []
  if (roomIds.length) {
    const { data: rows } = await sb
      .from('v2_playlist_rooms')
      .select('*, v2_circles(slug, visibility)')
      .in('id', roomIds)
    savedRooms = (rows || [])
      .filter(r => {
        const c = (r as { v2_circles?: { visibility?: string } }).v2_circles
        return c && isPublicCircleVisibility(c.visibility)
      })
      .map(row => {
        const circle = (row as { v2_circles?: { slug: string } }).v2_circles
        return {
          id: String(row.id),
          slug: String(row.slug),
          name: String(row.name),
          description: String(row.description || ''),
          coverImageUrl: String(row.cover_image_url || ''),
          trackCount: Number(row.track_count || 0),
          platform: (row.platform as PlatformTag) || 'spotify',
          circleSlug: circle?.slug,
          circleId: row.circle_id ? String(row.circle_id) : undefined,
        }
      })
  }

  const { data: rsvps } = await sb
    .from('v2_session_participation')
    .select('session_id, rsvp_status, v2_sessions(*, v2_circles(slug, name, visibility))')
    .eq('user_id', userId)
    .in('rsvp_status', ['going', 'interested'])

  const myRsvpSessions: V2Session[] = []
  for (const r of rsvps || []) {
    const sessionRaw = (r as unknown as { v2_sessions?: Record<string, unknown> & { v2_circles?: { slug: string; name: string; visibility?: string } | { slug: string; name: string; visibility?: string }[] } }).v2_sessions
    const raw = Array.isArray(sessionRaw) ? null : sessionRaw
    if (!raw) continue
    const circleRaw = raw.v2_circles
    const circle = Array.isArray(circleRaw) ? circleRaw[0] : circleRaw
    if (circle && !isPublicCircleVisibility(circle.visibility)) continue
    myRsvpSessions.push(mapSessionRow(raw, circle ? { slug: circle.slug, name: circle.name } : undefined))
  }

  return { followedCircles, followedHosts, savedSessions, savedRooms, myRsvpSessions }
}

/** Home feed: activity from followed circles and hosts (public only). */
export async function fetchFollowedActivity(userId: string): Promise<{
  circleSessions: V2Session[]
  hostSessions: V2Session[]
  followedCircles: V2Circle[]
}> {
  const sb = createServerSupabase()
  const { data: circleFollows } = await sb.from('v2_circle_follows').select('circle_id').eq('user_id', userId)
  const { data: hostFollows } = await sb.from('v2_host_follows').select('host_user_id').eq('user_id', userId)

  const circleIds = (circleFollows || []).map(r => r.circle_id as string)
  const hostIds = (hostFollows || []).map(r => r.host_user_id as string)

  const empty = { circleSessions: [], hostSessions: [], followedCircles: [] as V2Circle[] }

  if (!circleIds.length && !hostIds.length) return empty

  let followedCircles: V2Circle[] = []
  if (circleIds.length) {
    const { data } = await sb.from('v2_circles').select('*').in('id', circleIds).eq('visibility', 'public')
    followedCircles = (data || []).map(r => mapCircleRow(r as Record<string, unknown>))
  }

  const queries: Promise<{ data: unknown[] | null }>[] = []
  if (circleIds.length) {
    queries.push(
      sb.from('v2_sessions')
        .select('*, v2_circles!inner(slug, name, visibility)')
        .in('circle_id', circleIds)
        .eq('v2_circles.visibility', 'public')
        .neq('status', 'ended')
        .order('starts_at', { ascending: true })
        .limit(8) as unknown as Promise<{ data: unknown[] | null }>,
    )
  } else {
    queries.push(Promise.resolve({ data: [] }))
  }

  if (hostIds.length) {
    queries.push(
      sb.from('v2_sessions')
        .select('*, v2_circles!inner(slug, name, visibility)')
        .in('host_user_id', hostIds)
        .eq('v2_circles.visibility', 'public')
        .neq('status', 'ended')
        .order('starts_at', { ascending: true })
        .limit(8) as unknown as Promise<{ data: unknown[] | null }>,
    )
  } else {
    queries.push(Promise.resolve({ data: [] }))
  }

  const [{ data: circleSessionsRaw }, { data: hostSessionsRaw }] = await Promise.all(queries)

  const mapRows = (rows: unknown[]) => (rows as Record<string, unknown>[]).map(row => {
    const circle = (row as { v2_circles?: { slug: string; name: string } }).v2_circles
    return mapSessionRow(row, circle)
  })

  return {
    circleSessions: mapRows(circleSessionsRaw || []),
    hostSessions: mapRows(hostSessionsRaw || []),
    followedCircles,
  }
}

export async function getCircleFollowState(userId: string | null, circleId: string): Promise<{ following: boolean; followerCount: number }> {
  const service = v2ServiceClient()
  const { data: circle } = await service.from('v2_circles').select('follower_count').eq('id', circleId).maybeSingle()
  if (!userId) return { following: false, followerCount: circle?.follower_count || 0 }
  const { data } = await createServerSupabase()
    .from('v2_circle_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('circle_id', circleId)
    .maybeSingle()
  return { following: !!data, followerCount: circle?.follower_count || 0 }
}

export async function getHostFollowState(userId: string | null, hostUserId: string): Promise<{ following: boolean; followerCount: number }> {
  const service = v2ServiceClient()
  const { count } = await service.from('v2_host_follows').select('id', { count: 'exact', head: true }).eq('host_user_id', hostUserId)
  if (!userId) return { following: false, followerCount: count || 0 }
  const { data } = await createServerSupabase()
    .from('v2_host_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('host_user_id', hostUserId)
    .maybeSingle()
  return { following: !!data, followerCount: count || 0 }
}

export async function getPlaylistRoomSaveState(userId: string | null, roomId: string): Promise<{ saved: boolean; saveCount: number }> {
  const service = v2ServiceClient()
  const { count } = await service
    .from('v2_saved_community_items')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'playlist_room')
    .eq('entity_id', roomId)
  if (!userId) return { saved: false, saveCount: count || 0 }
  const { data } = await createServerSupabase()
    .from('v2_saved_community_items')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', 'playlist_room')
    .eq('entity_id', roomId)
    .maybeSingle()
  return { saved: !!data, saveCount: count || 0 }
}

export async function getSessionSaveState(userId: string | null, sessionId: string): Promise<{ saved: boolean; saveCount: number }> {
  const service = v2ServiceClient()
  const { count } = await service
    .from('v2_saved_community_items')
    .select('id', { count: 'exact', head: true })
    .eq('entity_type', 'session')
    .eq('entity_id', sessionId)
  if (!userId) return { saved: false, saveCount: count || 0 }
  const { data } = await createServerSupabase()
    .from('v2_saved_community_items')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', 'session')
    .eq('entity_id', sessionId)
    .maybeSingle()
  return { saved: !!data, saveCount: count || 0 }
}

export async function saveSessionForUser(sb: SupabaseClient, userId: string, sessionId: string): Promise<void> {
  await sb.from('v2_saved_community_items').upsert(
    { user_id: userId, entity_type: 'session', entity_id: sessionId },
    { onConflict: 'user_id,entity_type,entity_id' },
  )
}

export async function fetchCommunityDiscoverySummary(): Promise<{
  topCircles: { slug: string; name: string; followerCount: number }[]
  topHosts: { id: string; name: string; followerCount: number }[]
  topSessions: { id: string; title: string; saveCount: number }[]
}> {
  const service = v2ServiceClient()
  const [{ data: circles }, { data: hostRows }] = await Promise.all([
    service.from('v2_circles').select('slug, name, follower_count').eq('visibility', 'public').order('follower_count', { ascending: false }).limit(5),
    service.from('v2_host_follows').select('host_user_id'),
  ])

  const hostCounts = new Map<string, number>()
  for (const r of hostRows || []) {
    const id = r.host_user_id as string
    hostCounts.set(id, (hostCounts.get(id) || 0) + 1)
  }
  const topHostIds = Array.from(hostCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const { data: hostProfiles } = topHostIds.length
    ? await service.from('profiles').select('id, display_name').in('id', topHostIds.map(([id]) => id))
    : { data: [] }
  const nameMap = Object.fromEntries((hostProfiles || []).map(p => [p.id, p.display_name || 'Host']))

  const { data: savedSessions } = await service
    .from('v2_saved_community_items')
    .select('entity_id')
    .eq('entity_type', 'session')

  const sessionCounts = new Map<string, number>()
  for (const r of savedSessions || []) {
    const id = r.entity_id as string
    sessionCounts.set(id, (sessionCounts.get(id) || 0) + 1)
  }
  const topSessionIds = Array.from(sessionCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const { data: sessions } = topSessionIds.length
    ? await service.from('v2_sessions').select('id, title').in('id', topSessionIds.map(([id]) => id))
    : { data: [] }
  const titleMap = Object.fromEntries((sessions || []).map(s => [s.id, s.title]))

  return {
    topCircles: (circles || []).map(c => ({ slug: c.slug, name: c.name, followerCount: c.follower_count || 0 })),
    topHosts: topHostIds.map(([id, count]) => ({ id, name: nameMap[id] || 'Host', followerCount: count })),
    topSessions: topSessionIds.map(([id, count]) => ({ id, title: titleMap[id] || 'Session', saveCount: count })),
  }
}
