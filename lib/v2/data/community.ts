import { createServerSupabase } from '@/lib/supabase/server'
import { fetchIsV2Admin } from '@/lib/v2/hostAccess'
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

export function mapCircleRow(row: Record<string, unknown>): V2Circle {
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
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    followerCount: row.follower_count != null ? Number(row.follower_count) : undefined,
  }
}

export function mapSessionRow(row: Record<string, unknown>, circle?: { slug: string; name: string }, hostName?: string): V2Session {
  return {
    id: String(row.id),
    slug: String(row.slug || ''),
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    hostName: hostName || 'Host',
    hostUserId: row.host_user_id ? String(row.host_user_id) : undefined,
    circleSlug: circle?.slug || '',
    circleName: circle?.name || '',
    circleId: row.circle_id ? String(row.circle_id) : undefined,
    status: (row.status as V2SessionStatus) || 'upcoming',
    startsAt: String(row.starts_at),
    endsAt: row.ends_at ? String(row.ends_at) : undefined,
    timezone: row.timezone ? String(row.timezone) : undefined,
    isRecurring: !!row.is_recurring,
    recurrenceRule: row.recurrence_rule ? String(row.recurrence_rule) : undefined,
    parentSessionId: row.parent_session_id ? String(row.parent_session_id) : undefined,
    rsvpCount: row.rsvp_count != null ? Number(row.rsvp_count) : undefined,
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

export async function fetchCommunitySessionById(id: string): Promise<{
  session: V2Session | null
  fromMock: boolean
  queueRows: import('@/lib/v2/types').V2SessionSongRow[]
  isHost: boolean
  userJoined: boolean
}> {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('v2_sessions')
    .select('*, v2_circles(slug, name)')
    .or(`id.eq.${id},slug.eq.${id}`)
    .maybeSingle()
  if (error || !data) {
    const mock = getMockSession(id)
    if (mock) return { session: mock, fromMock: true, queueRows: [], isHost: false, userJoined: false }
    const bySlug = V2_SESSIONS.find(s => s.id === id)
    return { session: bySlug || null, fromMock: !!bySlug, queueRows: [], isHost: false, userJoined: false }
  }
  const circle = (data as { v2_circles?: { slug: string; name: string } }).v2_circles
  let hostName = 'Host'
  if (data.host_user_id) {
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', data.host_user_id).maybeSingle()
    if (profile?.display_name) hostName = profile.display_name
  }
  const session = mapSessionRow(data as Record<string, unknown>, circle, hostName)
  const isAdmin = user ? await fetchIsV2Admin(supabase, user.id) : false
  session.isHost = user?.id === data.host_user_id || isAdmin
  const { data: queueRows } = await supabase
    .from('v2_session_songs')
    .select('id, session_id, song_id, title, artist_name, duration_label, is_now_playing, status, position, submitted_by, played_at')
    .eq('session_id', data.id)
    .neq('status', 'removed')
    .order('position', { ascending: true })

  const submitterIds = Array.from(new Set((queueRows || []).map(q => q.submitted_by).filter(Boolean))) as string[]
  let submitterNames: Record<string, string> = {}
  if (submitterIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', submitterIds)
    submitterNames = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Member']))
  }

  const mappedRows: import('@/lib/v2/types').V2SessionSongRow[] = (queueRows || []).map(q => ({
    id: q.id,
    sessionId: q.session_id,
    songId: q.song_id ?? undefined,
    title: q.title,
    artistName: q.artist_name || '',
    status: (q.status || 'approved') as import('@/lib/v2/types').V2SubmissionStatus,
    position: q.position,
    submittedBy: q.submitted_by ?? undefined,
    submittedByName: q.submitted_by ? submitterNames[q.submitted_by] : undefined,
    isNowPlaying: q.is_now_playing,
    duration: q.duration_label || '',
    playedAt: q.played_at ?? undefined,
  }))

  if (mappedRows.length) {
    session.queue = mappedRows.filter(r => r.status === 'approved' && !r.playedAt).map(q => ({
      position: q.position,
      title: q.title,
      artistName: q.artistName,
      duration: q.duration || '',
      isNowPlaying: q.isNowPlaying,
    }))
  }

  let userJoined = false
  if (user) {
    const { data: part } = await supabase
      .from('v2_session_participation')
      .select('id')
      .eq('session_id', data.id)
      .eq('user_id', user.id)
      .eq('status', 'joined')
      .maybeSingle()
    userJoined = !!part
    session.userJoined = userJoined
  }

  return { session, fromMock: false, queueRows: mappedRows, isHost: session.isHost || false, userJoined }
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

/** Circle song submissions from v2_circle_songs */
export async function fetchSongsForCircle(circleSlug: string, circleId?: string, opts?: { approvedOnly?: boolean }): Promise<{ songs: V2Song[]; fromMock: boolean }> {
  const supabase = createServerSupabase()
  let resolvedId = circleId
  if (!resolvedId) {
    const { data: circle } = await supabase.from('v2_circles').select('id').eq('slug', circleSlug).maybeSingle()
    resolvedId = circle?.id
  }
  if (!resolvedId) return { songs: getSongsForCircle(circleSlug), fromMock: true }

  const { data: rows, error } = await supabase
    .from('v2_circle_songs')
    .select('song_id, status, songs(id, artist_id, title, status, lyrics_instructions, cover_image_url, spotify_cover_url, spotify_url, media_links, publish_content, artists(name, page_slug))')
    .eq('circle_id', resolvedId)
    .in('status', opts?.approvedOnly ? ['approved'] : ['pending', 'approved'])
    .order('created_at', { ascending: false })
    .limit(24)

  if (error || !rows?.length) {
    const fallback = getSongsForCircle(circleSlug)
    return { songs: fallback, fromMock: !rows?.length && fallback.length > 0 }
  }

  const { mapSongRow } = await import('@/lib/v2/mappers')
  const { artistCommunitySlug } = await import('@/lib/v2/slug')

  const songs = rows
    .map(r => {
      const row = r as unknown as { songs?: Record<string, unknown> & { artists?: { name: string; page_slug?: string } | { name: string; page_slug?: string }[] } }
      const song = row.songs
      if (!song) return null
      const artistRaw = song.artists
      const artist = Array.isArray(artistRaw) ? artistRaw[0] : artistRaw
      return mapSongRow(song as Parameters<typeof mapSongRow>[0], artist ? {
        name: artist.name,
        slug: artistCommunitySlug({ id: String(song.artist_id), name: artist.name, page_slug: artist.page_slug }),
      } : null)
    })
    .filter((s): s is V2Song => !!s)

  return { songs, fromMock: false }
}

export async function fetchCircleMembership(slug: string, userId?: string | null): Promise<boolean> {
  if (!userId) return false
  const supabase = createServerSupabase()
  const { data: circle } = await supabase.from('v2_circles').select('id').eq('slug', slug).maybeSingle()
  if (!circle) return false
  const { data } = await supabase.from('v2_circle_members').select('id').eq('circle_id', circle.id).eq('user_id', userId).maybeSingle()
  return !!data
}

export async function fetchPlaylistRoomBySlug(slug: string): Promise<{ room: V2PlaylistRoom | null; fromMock: boolean }> {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('v2_playlist_rooms')
    .select('*, v2_circles(slug)')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) {
    const mock = V2_PLAYLISTS.find(p => p.slug === slug)
    return { room: mock || null, fromMock: !!mock }
  }
  const circle = (data as { v2_circles?: { slug: string } | null }).v2_circles
  return {
    room: {
      id: String(data.id),
      slug: String(data.slug),
      name: String(data.name),
      description: String(data.description || ''),
      coverImageUrl: String(data.cover_image_url || ''),
      trackCount: Number(data.track_count || 0),
      platform: (data.platform as PlatformTag) || 'spotify',
      circleSlug: circle?.slug,
      circleId: data.circle_id ? String(data.circle_id) : undefined,
      campaignId: data.creator_playlist_id ? String(data.creator_playlist_id) : undefined,
      ownerUserId: data.owner_user_id ? String(data.owner_user_id) : undefined,
      roundStatus: (data.round_status as 'active' | 'completed') || 'active',
      lastCompletedAt: data.last_completed_at ?? undefined,
    },
    fromMock: false,
  }
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
