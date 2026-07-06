import { createServerSupabase } from '@/lib/supabase/server'
import {
  V2_CIRCLES,
  V2_PLAYLISTS,
  V2_SESSIONS,
  getCircleBySlug as getMockCircle,
  getSessionById as getMockSession,
  getSessionsForCircle,
  getSongsForCircle,
} from '@/lib/v2/mockData'
import type { CreationType, PlatformTag, V2Circle, V2PlaylistRoom, V2QueueTrack, V2Session, V2SessionStatus, V2Song } from '@/lib/v2/types'

function mapCircleRow(row: Record<string, unknown>): V2Circle {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description || ''),
    coverImageUrl: String(row.cover_image_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80'),
    tags: (row.tags as string[]) || [],
    creationTypes: ((row.creation_types as string[]) || []) as CreationType[],
    platforms: ((row.platforms as string[]) || []) as PlatformTag[],
    memberCount: Number(row.member_count || 0),
    sessionCount: Number(row.session_count || 0),
    visibility: (row.visibility as V2Circle['visibility']) || 'public',
    featured: !!row.featured,
  }
}

function mapSessionRow(row: Record<string, unknown>, circle?: { slug: string; name: string }): V2Session {
  return {
    id: String(row.id),
    title: String(row.title),
    hostName: 'Host',
    circleSlug: circle?.slug || '',
    circleName: circle?.name || '',
    status: (row.status as V2SessionStatus) || 'upcoming',
    startsAt: String(row.starts_at),
    platform: (row.platform as PlatformTag) || 'spotify',
    coverImageUrl: String(row.cover_image_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80'),
    trackCount: Number(row.track_count || 0),
    artistCount: Number(row.artist_count || 0),
    joinedCount: Number(row.joined_count || 0),
    feedbackPending: Number(row.feedback_pending || 0) || undefined,
    seatsOpen: row.seats_open != null ? Number(row.seats_open) : undefined,
    queue: [],
    features: (row.features as string[]) || [],
    creationTypes: ((row.creation_types as string[]) || []) as CreationType[],
  }
}

/** TODO: join v2_session_songs for queue; Aigent4U Stream Engine live state in stream_engine_meta */
export async function fetchCommunityCircles(): Promise<{ circles: V2Circle[]; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.from('v2_circles').select('*').order('featured', { ascending: false }).limit(48)
  if (error || !data?.length) return { circles: V2_CIRCLES, fromMock: true }
  return { circles: data.map(r => mapCircleRow(r as Record<string, unknown>)), fromMock: false }
}

export async function fetchCommunityCircleBySlug(slug: string): Promise<{ circle: V2Circle | null; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.from('v2_circles').select('*').eq('slug', slug).maybeSingle()
  if (error || !data) {
    const mock = getMockCircle(slug)
    return { circle: mock || null, fromMock: !!mock }
  }
  return { circle: mapCircleRow(data as Record<string, unknown>), fromMock: false }
}

export async function fetchCommunitySessions(): Promise<{ sessions: V2Session[]; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.from('v2_sessions').select('*, v2_circles(slug, name)').order('starts_at', { ascending: true }).limit(48)
  if (error || !data?.length) return { sessions: V2_SESSIONS, fromMock: true }
  return {
    sessions: data.map(row => {
      const circle = (row as { v2_circles?: { slug: string; name: string } }).v2_circles
      return mapSessionRow(row as Record<string, unknown>, circle)
    }),
    fromMock: false,
  }
}

export async function fetchCommunitySessionById(id: string): Promise<{ session: V2Session | null; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('v2_sessions')
    .select('*, v2_circles(slug, name)')
    .or(`id.eq.${id},slug.eq.${id}`)
    .maybeSingle()
  if (error || !data) {
    const mock = getMockSession(id)
    if (mock) return { session: mock, fromMock: true }
    const bySlug = V2_SESSIONS.find(s => s.id === id)
    return { session: bySlug || null, fromMock: !!bySlug }
  }
  const circle = (data as { v2_circles?: { slug: string; name: string } }).v2_circles
  const session = mapSessionRow(data as Record<string, unknown>, circle)
  const { data: queueRows } = await supabase
    .from('v2_session_songs')
    .select('position, title, artist_name, duration_label, is_now_playing')
    .eq('session_id', data.id)
    .order('position', { ascending: true })
  if (queueRows?.length) {
    session.queue = queueRows.map(q => ({
      position: q.position,
      title: q.title,
      artistName: q.artist_name || '',
      duration: q.duration_label || '',
      isNowPlaying: q.is_now_playing,
    })) as V2QueueTrack[]
  }
  return { session, fromMock: false }
}

export async function fetchSessionsForCircle(circleSlug: string, circleId?: string): Promise<{ sessions: V2Session[]; fromMock: boolean }> {
  const supabase = createServerSupabase()
  let resolvedCircleId = circleId
  if (!resolvedCircleId) {
    const { data: circle } = await supabase.from('v2_circles').select('id').eq('slug', circleSlug).maybeSingle()
    resolvedCircleId = circle?.id
  }
  if (!resolvedCircleId) {
    return { sessions: getSessionsForCircle(circleSlug), fromMock: true }
  }

  const { data, error } = await supabase
    .from('v2_sessions')
    .select('*, v2_circles(slug, name)')
    .eq('circle_id', resolvedCircleId)
    .order('starts_at', { ascending: true })

  if (error || !data?.length) {
    return { sessions: getSessionsForCircle(circleSlug), fromMock: true }
  }

  return {
    sessions: data.map(row => {
      const circle = (row as { v2_circles?: { slug: string; name: string } }).v2_circles
      return mapSessionRow(row as Record<string, unknown>, circle)
    }),
    fromMock: false,
  }
}

/** TODO: v2_session_songs + songs join when circle submissions are seeded */
export async function fetchSongsForCircle(circleSlug: string): Promise<{ songs: V2Song[]; fromMock: boolean }> {
  return { songs: getSongsForCircle(circleSlug), fromMock: true }
}

export async function fetchPlaylistRooms(): Promise<{ rooms: V2PlaylistRoom[]; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('v2_playlist_rooms')
    .select('*, v2_circles(slug)')
    .order('created_at', { ascending: false })
    .limit(24)
  if (error || !data?.length) return { rooms: V2_PLAYLISTS, fromMock: true }
  return {
    rooms: data.map(row => {
      const circle = (row as { v2_circles?: { slug: string } | null }).v2_circles
      return {
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
        description: String(row.description || ''),
        coverImageUrl: String(row.cover_image_url || ''),
        trackCount: Number(row.track_count || 0),
        platform: (row.platform as PlatformTag) || 'spotify',
        circleSlug: circle?.slug,
      }
    }),
    fromMock: false,
  }
}
