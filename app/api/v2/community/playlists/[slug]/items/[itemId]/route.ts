import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { mapSubmissionRow } from '@/lib/v2/data/curatorRooms'
import {
  buildCuratorSongAddedToPlaylist,
  buildCuratorSubmissionAccepted,
  buildCuratorSubmissionRejected,
  buildCuratorSubmissionShortlisted,
} from '@/lib/v2/communityNotifications'
import { createManyCommunityNotifications } from '@/lib/v2/data/communityNotifications'
import type { V2CuratorSubmissionStatus } from '@/lib/v2/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = new Set<V2CuratorSubmissionStatus>([
  'pending', 'reviewing', 'shortlisted', 'accepted', 'rejected',
  'added_to_playlist', 'removed_from_playlist', 'approved', 'removed',
])

async function resolveItem(slug: string, itemId: string) {
  const sb = v2ServiceClient()
  const { data: room } = await sb.from('v2_playlist_rooms').select('id, slug, name, owner_user_id').eq('slug', slug).maybeSingle()
  if (!room) return { sb, room: null, item: null }
  const { data: item } = await sb.from('v2_playlist_room_items').select('*').eq('id', itemId).eq('room_id', room.id).maybeSingle()
  return { sb, room, item }
}

export async function PATCH(req: NextRequest, { params }: { params: { slug: string; itemId: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { room, item } = await resolveItem(params.slug, params.itemId)
  if (!room || !item) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (room.owner_user_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if (typeof body.status === 'string' && STATUSES.has(body.status as V2CuratorSubmissionStatus)) {
    patch.status = body.status
    if (body.status === 'added_to_playlist') {
      patch.played_at = new Date().toISOString()
      patch.external_added_at = new Date().toISOString()
    }
  }
  if (typeof body.curator_note === 'string') patch.curator_note = body.curator_note.slice(0, 1000)
  if (typeof body.curator_note_shared === 'boolean') patch.curator_note_shared = body.curator_note_shared
  if (typeof body.featured === 'boolean') patch.featured = body.featured
  if (typeof body.session_id === 'string') patch.session_id = body.session_id
  if (typeof body.position === 'number') patch.position = body.position

  const { data, error } = await sb
    .from('v2_playlist_room_items')
    .update(patch)
    .eq('id', params.itemId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const submitterId = item.submitted_by as string | null
  if (submitterId && patch.status) {
    const notifications = []
    const title = String(item.title)
    if (patch.status === 'shortlisted') {
      notifications.push(buildCuratorSubmissionShortlisted({ userId: submitterId, roomSlug: room.slug, roomName: room.name, songTitle: title }))
    } else if (patch.status === 'accepted' || patch.status === 'approved') {
      notifications.push(buildCuratorSubmissionAccepted({ userId: submitterId, roomSlug: room.slug, roomName: room.name, songTitle: title }))
    } else if (patch.status === 'rejected' || patch.status === 'removed') {
      notifications.push(buildCuratorSubmissionRejected({ userId: submitterId, roomSlug: room.slug, roomName: room.name, songTitle: title }))
    } else if (patch.status === 'added_to_playlist') {
      notifications.push(buildCuratorSongAddedToPlaylist({ userId: submitterId, roomSlug: room.slug, roomName: room.name, songTitle: title }))
    }
    if (notifications.length) await createManyCommunityNotifications(sb, notifications)
  }

  return NextResponse.json({ item: mapSubmissionRow(data as Record<string, unknown>) })
}
