import { v2ServiceClient } from '@/lib/v2/apiAuth'
import { roomDnaFromMeta } from '@/lib/v2/curatorMatching/buildRoomDna'
import type { CuratorMatchResult } from '@/lib/v2/curatorMatching/curatorMatchTypes'
import { fetchPlaylistRoomBySlug } from '@/lib/v2/data/community'
import { getPlaylistRoomSaveState } from '@/lib/v2/data/followsSaves'
import { fetchRoomCircleVisibility } from '@/lib/v2/data/publicDiscovery'
import type {
  PlatformTag,
  V2CuratorLinkedPlaylist,
  V2CuratorRoomDashboard,
  V2CuratorRoomMeta,
  V2CuratorSubmission,
  V2CuratorSubmissionStatus,
  V2PlaylistRoom,
  V2Session,
} from '@/lib/v2/types'
import { mapSessionRow } from '@/lib/v2/data/community'

export function mapLinkedPlaylistRow(row: Record<string, unknown>): V2CuratorLinkedPlaylist {
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    platform: (row.platform as V2CuratorLinkedPlaylist['platform']) || 'mixed',
    playlistUrl: String(row.playlist_url),
    externalPlaylistId: row.external_playlist_id ? String(row.external_playlist_id) : undefined,
    title: row.title ? String(row.title) : undefined,
    description: row.description ? String(row.description) : undefined,
    coverImageUrl: row.cover_image_url ? String(row.cover_image_url) : undefined,
    curatorName: row.curator_name ? String(row.curator_name) : undefined,
    syncStatus: (row.sync_status as V2CuratorLinkedPlaylist['syncStatus']) || 'manual',
    lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : undefined,
    trackCount: Number(row.track_count || 0),
    totalDurationSeconds: Number(row.total_duration_seconds || 0),
    latestSnapshotId: row.latest_snapshot_id ? String(row.latest_snapshot_id) : undefined,
    position: Number(row.position || 1),
  }
}

export function mapSubmissionRow(row: Record<string, unknown>, submitterName?: string): V2CuratorSubmission {
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    songId: row.song_id ? String(row.song_id) : undefined,
    title: String(row.title),
    artistName: String(row.artist_name || 'Artist'),
    position: Number(row.position || 0),
    status: (row.status as V2CuratorSubmissionStatus) || 'pending',
    pitch: row.pitch ? String(row.pitch) : undefined,
    curatorNote: row.curator_note ? String(row.curator_note) : undefined,
    curatorNoteShared: !!row.curator_note_shared,
    externalUrl: row.external_url ? String(row.external_url) : undefined,
    submittedBy: row.submitted_by ? String(row.submitted_by) : undefined,
    submittedByName: submitterName,
    createdAt: String(row.created_at),
    playedAt: row.played_at ? String(row.played_at) : undefined,
    featured: !!row.featured,
    sessionId: row.session_id ? String(row.session_id) : undefined,
    externalAddedAt: row.external_added_at ? String(row.external_added_at) : undefined,
    aiMatch: row.ai_match as CuratorMatchResult | undefined,
  }
}

export function mapRoomWithMeta(row: Record<string, unknown>, circle?: { slug: string }): V2PlaylistRoom {
  const meta = (row.room_meta as V2CuratorRoomMeta) || {}
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
    campaignId: row.creator_playlist_id ? String(row.creator_playlist_id) : undefined,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : undefined,
    roundStatus: (row.round_status as V2PlaylistRoom['roundStatus']) || 'active',
    lastCompletedAt: row.last_completed_at ? String(row.last_completed_at) : undefined,
    submissionOpen: row.submission_open !== false,
    roomMeta: { ...meta, dna: roomDnaFromMeta(meta as unknown as Record<string, unknown>) },
    currentSnapshotId: row.current_snapshot_id ? String(row.current_snapshot_id) : undefined,
  }
}

export async function fetchCuratorRoomDashboard(
  slug: string,
  viewerUserId?: string | null,
): Promise<{ dashboard: V2CuratorRoomDashboard | null; fromMock: boolean }> {
  const { room: baseRoom, fromMock } = await fetchPlaylistRoomBySlug(slug)
  if (!baseRoom || fromMock) return { dashboard: null, fromMock }

  const sb = v2ServiceClient()
  const { data: row } = await sb
    .from('v2_playlist_rooms')
    .select('*, v2_circles(slug, visibility, member_count)')
    .eq('slug', slug)
    .maybeSingle()

  if (!row) return { dashboard: null, fromMock }

  const circleRaw = (row as { v2_circles?: { slug: string; visibility?: string; member_count?: number } | null }).v2_circles
  const room = mapRoomWithMeta(row as Record<string, unknown>, circleRaw || undefined)

  const [{ data: linked }, { data: items }, saveState, visibility] = await Promise.all([
    sb.from('v2_curator_linked_playlists').select('*').eq('room_id', room.id).order('position', { ascending: true }),
    sb.from('v2_playlist_room_items').select('*').eq('room_id', room.id).order('position', { ascending: true }),
    getPlaylistRoomSaveState(viewerUserId ?? null, room.id),
    fetchRoomCircleVisibility(slug),
  ])

  let upcomingSession: V2Session | null = null
  let recentSessions: V2Session[] = []
  if (room.circleId) {
    const { data: sessions } = await sb
      .from('v2_sessions')
      .select('*, v2_circles(slug, name)')
      .eq('circle_id', room.circleId)
      .order('starts_at', { ascending: true })
      .limit(12)
    const mapped = (sessions || []).map(s => {
      const c = (s as { v2_circles?: { slug: string; name: string } }).v2_circles
      return mapSessionRow(s as Record<string, unknown>, c)
    })
    upcomingSession = mapped.find(s => s.status !== 'ended') || null
    recentSessions = mapped.filter(s => s.status === 'ended').slice(0, 4)
  }

  let hostName: string | undefined
  if (room.ownerUserId) {
    const { data: profile } = await sb.from('profiles').select('display_name, full_name').eq('id', room.ownerUserId).maybeSingle()
    hostName = profile?.display_name || profile?.full_name || 'Curator'
  }

  const submissions = (items || []).map(i => mapSubmissionRow(i as Record<string, unknown>))
  const isOwner = viewerUserId === room.ownerUserId
  const publicStatuses = new Set(['accepted', 'added_to_playlist', 'shortlisted', 'approved'])

  const visibleSubmissions = isOwner
    ? submissions
    : submissions.filter(s => publicStatuses.has(s.status) || s.submittedBy === viewerUserId)

  const playlistItems = submissions.filter(s =>
    ['added_to_playlist', 'accepted', 'approved'].includes(s.status),
  )

  return {
    fromMock: false,
    dashboard: {
      room,
      linkedPlaylists: (linked || []).map(r => mapLinkedPlaylistRow(r as Record<string, unknown>)),
      submissions: visibleSubmissions,
      playlistItems: isOwner ? playlistItems : playlistItems,
      saveCount: saveState.saveCount,
      followerCount: 0,
      memberCount: Number(circleRaw?.member_count || 0),
      upcomingSession,
      recentSessions,
      hostName,
      visibility: visibility as V2CuratorRoomDashboard['visibility'],
    },
  }
}

export async function fetchUserCuratorSubmissions(userId: string, songId?: string) {
  const sb = v2ServiceClient()
  let q = sb
    .from('v2_playlist_room_items')
    .select('*, v2_playlist_rooms(slug, name)')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (songId) q = q.eq('song_id', songId)

  const { data } = await q
  return (data || []).map(row => {
    const roomRaw = (row as { v2_playlist_rooms?: { slug: string; name: string } }).v2_playlist_rooms
    return {
      ...mapSubmissionRow(row as Record<string, unknown>),
      roomSlug: roomRaw?.slug,
      roomName: roomRaw?.name,
    }
  })
}

export function parsePlaylistUrl(platform: string, url: string): { externalId?: string; title?: string } {
  try {
    const u = new URL(url)
    if (platform === 'spotify' && u.hostname.includes('spotify.com')) {
      const parts = u.pathname.split('/').filter(Boolean)
      const idx = parts.indexOf('playlist')
      if (idx >= 0 && parts[idx + 1]) return { externalId: parts[idx + 1] }
    }
    if (platform === 'youtube' && (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be'))) {
      const list = u.searchParams.get('list')
      if (list) return { externalId: list }
    }
  } catch {}
  return {}
}
