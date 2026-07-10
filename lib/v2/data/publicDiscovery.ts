import { v2ServiceClient } from '@/lib/v2/apiAuth'
import { mapCircleRow, mapSessionRow } from '@/lib/v2/data/community'
import { isPublicCircleVisibility } from '@/lib/v2/publicVisibility'
import type {
  CircleVisibility,
  PlatformTag,
  V2Circle,
  V2PlaylistRoom,
  V2PublicExploreData,
  V2PublicExploreFilters,
  V2PublicHostProfile,
  V2Session,
} from '@/lib/v2/types'

function sb() {
  return v2ServiceClient()
}

type CircleRow = { id: string; visibility: string; slug: string; name: string; owner_user_id?: string }

async function publicCircleIds(): Promise<string[]> {
  const { data } = await sb().from('v2_circles').select('id').eq('visibility', 'public')
  return (data || []).map(r => r.id)
}

/** Check if a slug exists but is not public — for restricted state without leaking content. */
export async function checkCircleRestricted(slug: string): Promise<{ exists: boolean; visibility?: CircleVisibility }> {
  const { data } = await sb().from('v2_circles').select('visibility').eq('slug', slug).maybeSingle()
  if (!data) return { exists: false }
  return { exists: true, visibility: data.visibility as CircleVisibility }
}

export async function fetchPublicExploreData(filters: V2PublicExploreFilters = {}): Promise<V2PublicExploreData> {
  const publicIds = await publicCircleIds()

  let circleQuery = sb().from('v2_circles').select('*').eq('visibility', 'public').order('featured', { ascending: false }).limit(24)
  if (filters.genre) circleQuery = circleQuery.contains('tags', [filters.genre])
  if (filters.platform) circleQuery = circleQuery.contains('platforms', [filters.platform])

  let sessionQuery = sb()
    .from('v2_sessions')
    .select('*, v2_circles!inner(slug, name, visibility)')
    .eq('v2_circles.visibility', 'public')
    .order('starts_at', { ascending: true })
    .limit(32)

  if (filters.platform) sessionQuery = sessionQuery.eq('platform', filters.platform)
  if (filters.status && filters.status !== 'all') sessionQuery = sessionQuery.eq('status', filters.status)

  let roomQuery = sb()
    .from('v2_playlist_rooms')
    .select('*, v2_circles!inner(slug, visibility)')
    .eq('v2_circles.visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(16)

  if (filters.platform) roomQuery = roomQuery.eq('platform', filters.platform)

  const [{ data: circles }, { data: sessions }, { data: rooms }] = await Promise.all([
    filters.type === 'session' || filters.type === 'playlist_room' ? Promise.resolve({ data: [] }) : circleQuery,
    filters.type === 'circle' || filters.type === 'playlist_room' ? Promise.resolve({ data: [] }) : sessionQuery,
    filters.type === 'circle' || filters.type === 'session' ? Promise.resolve({ data: [] }) : roomQuery,
  ])

  const featuredCircles = (circles || []).map(r => mapCircleRow(r as Record<string, unknown>))
  const mappedSessions = (sessions || []).map(row => {
    const circle = (row as { v2_circles?: { slug: string; name: string } }).v2_circles
    return mapSessionRow(row as Record<string, unknown>, circle)
  })

  const playlistRooms: V2PlaylistRoom[] = (rooms || []).map(row => {
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
      ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    }
  })

  const genres = Array.from(new Set(featuredCircles.flatMap(c => c.tags))).sort().slice(0, 24)
  const platforms = Array.from(new Set([
    ...featuredCircles.flatMap(c => c.platforms),
    ...mappedSessions.map(s => s.platform),
    ...playlistRooms.map(r => r.platform),
  ])).sort()

  return {
    featuredCircles: featuredCircles.filter(c => !filters.genre || c.tags.includes(filters.genre)),
    upcomingSessions: mappedSessions.filter(s => s.status === 'upcoming'),
    liveSessions: mappedSessions.filter(s => s.status === 'live'),
    playlistRooms,
    genres,
    platforms,
  }
}

export async function fetchPublicHostProfile(userId: string): Promise<V2PublicHostProfile | null> {
  const { data: profile } = await sb().from('profiles').select('id, display_name, avatar_url, bio').eq('id', userId).maybeSingle()
  if (!profile?.display_name) return null

  const [{ data: circles }, { data: sessions }, { data: rooms }, { count: completed }] = await Promise.all([
    sb().from('v2_circles').select('*').eq('owner_user_id', userId).eq('visibility', 'public').order('member_count', { ascending: false }).limit(12),
    sb()
      .from('v2_sessions')
      .select('*, v2_circles!inner(slug, name, visibility)')
      .eq('host_user_id', userId)
      .eq('v2_circles.visibility', 'public')
      .neq('status', 'ended')
      .order('starts_at', { ascending: true })
      .limit(12),
    sb()
      .from('v2_playlist_rooms')
      .select('*, v2_circles!inner(slug, visibility)')
      .eq('owner_user_id', userId)
      .eq('v2_circles.visibility', 'public')
      .limit(8),
    sb()
      .from('v2_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('host_user_id', userId)
      .eq('status', 'ended'),
  ])

  const hostedCircles = (circles || []).map(r => mapCircleRow(r as Record<string, unknown>))
  if (!hostedCircles.length && !(sessions || []).length && !(rooms || []).length && !completed) {
    return null
  }

  const upcomingSessions = (sessions || []).map(row => {
    const circle = (row as { v2_circles?: { slug: string; name: string } }).v2_circles
    return mapSessionRow(row as Record<string, unknown>, circle, profile.display_name)
  })

  const playlistRooms: V2PlaylistRoom[] = (rooms || []).map(row => {
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
      ownerUserId: userId,
    }
  })

  return {
    id: userId,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url || undefined,
    bio: profile.bio || undefined,
    isHost: true,
    hostedCircleCount: hostedCircles.length,
    completedSessionCount: completed || 0,
    upcomingSessions,
    hostedCircles,
    playlistRooms,
  }
}

export async function fetchPublicSitemapEntries(): Promise<{
  circles: { slug: string; updated_at?: string }[]
  sessions: { id: string; slug?: string; updated_at?: string }[]
  rooms: { slug: string; updated_at?: string }[]
  hosts: { id: string }[]
}> {
  const [{ data: circles }, { data: sessions }, { data: rooms }] = await Promise.all([
    sb().from('v2_circles').select('slug, updated_at').eq('visibility', 'public').limit(500),
    sb()
      .from('v2_sessions')
      .select('id, slug, updated_at, v2_circles!inner(visibility)')
      .eq('v2_circles.visibility', 'public')
      .in('status', ['upcoming', 'live'])
      .limit(500),
    sb()
      .from('v2_playlist_rooms')
      .select('slug, updated_at, v2_circles!inner(visibility)')
      .eq('v2_circles.visibility', 'public')
      .limit(200),
  ])

  const hostIds = new Set<string>()
  for (const c of circles || []) {
    // hosts derived from sessions
  }
  const { data: hostSessions } = await sb()
    .from('v2_sessions')
    .select('host_user_id, v2_circles!inner(visibility)')
    .eq('v2_circles.visibility', 'public')
    .limit(500)
  for (const s of hostSessions || []) hostIds.add(String(s.host_user_id))

  return {
    circles: (circles || []).map(c => ({ slug: c.slug, updated_at: c.updated_at })),
    sessions: (sessions || []).map(s => ({ id: s.slug || s.id, slug: s.slug, updated_at: s.updated_at })),
    rooms: (rooms || []).map(r => ({ slug: r.slug, updated_at: r.updated_at })),
    hosts: Array.from(hostIds).slice(0, 200).map(id => ({ id })),
  }
}

export async function fetchSessionCircleVisibility(sessionId: string): Promise<CircleVisibility | null> {
  const { data } = await sb()
    .from('v2_sessions')
    .select('circle_id, v2_circles(visibility)')
    .or(`id.eq.${sessionId},slug.eq.${sessionId}`)
    .maybeSingle()
  if (!data) return null
  const circleRaw = (data as { v2_circles?: { visibility: string } | { visibility: string }[] | null }).v2_circles
  const vis = Array.isArray(circleRaw) ? circleRaw[0]?.visibility : circleRaw?.visibility
  if (!data.circle_id) return 'public'
  return (vis as CircleVisibility) || null
}

export async function fetchRoomCircleVisibility(roomSlug: string): Promise<CircleVisibility | null> {
  const { data } = await sb()
    .from('v2_playlist_rooms')
    .select('circle_id, v2_circles(visibility)')
    .eq('slug', roomSlug)
    .maybeSingle()
  if (!data?.circle_id) return null
  const circleRaw = (data as { v2_circles?: { visibility: string } | { visibility: string }[] | null }).v2_circles
  const vis = Array.isArray(circleRaw) ? circleRaw[0]?.visibility : circleRaw?.visibility
  return (vis as CircleVisibility) || null
}

export function isCirclePublic(visibility: CircleVisibility | string | null | undefined): boolean {
  return isPublicCircleVisibility(visibility)
}
