import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { canManageSessionHost } from '@/lib/v2/hostAccess'
import { createCommunityNotification } from '@/lib/v2/data/communityNotifications'
import { buildSessionSubmissionApproved, buildSessionSubmissionRemoved } from '@/lib/v2/communityNotifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveSession(idOrSlug: string) {
  const sb = v2ServiceClient()
  return sb
    .from('v2_sessions')
    .select('id, slug, title, host_user_id, status, circle_id, v2_circles(visibility)')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle()
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const songId = typeof body.song_id === 'string' ? body.song_id : ''
  if (!songId) return NextResponse.json({ error: 'song_id_required' }, { status: 400 })

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (session.status === 'ended') return NextResponse.json({ error: 'session_ended' }, { status: 400 })

  const circleRaw = (session as unknown as { v2_circles?: { visibility: string } | { visibility: string }[] | null }).v2_circles
  const circle = Array.isArray(circleRaw) ? circleRaw[0] : circleRaw
  if (circle && circle.visibility !== 'public') {
    return NextResponse.json({ error: 'session_not_public' }, { status: 403 })
  }

  const { data: song } = await sb
    .from('songs')
    .select('id, title, artist_id, user_id, artists(name)')
    .eq('id', songId)
    .maybeSingle()
  if (!song || song.user_id !== userId) return NextResponse.json({ error: 'song_not_owned' }, { status: 403 })

  const artistRow = (song as { artists?: { name: string } | { name: string }[] | null }).artists
  const artistName = Array.isArray(artistRow) ? artistRow[0]?.name : artistRow?.name

  const { count } = await sb
    .from('v2_session_songs')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)

  const { data, error } = await sb
    .from('v2_session_songs')
    .insert({
      session_id: session.id,
      song_id: songId,
      artist_id: song.artist_id,
      submitted_by: userId,
      position: (count || 0) + 1,
      title: song.title,
      artist_name: artistName || 'Artist',
      status: 'pending',
    })
    .select('id, status, position')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submission: data })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = v2ServiceClient()
  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: rows } = await sb
    .from('v2_session_songs')
    .select('id, song_id, title, artist_name, position, status, is_now_playing, duration_label, submitted_by')
    .eq('session_id', session.id)
    .neq('status', 'removed')
    .order('position', { ascending: true })

  return NextResponse.json({ queue: rows || [] })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const canHost = await canManageSessionHost(sb, userId, session.host_user_id)
  if (!canHost) return NextResponse.json({ error: 'host_only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const rowId = typeof body.row_id === 'string' ? body.row_id : ''
  const status = body.status === 'approved' || body.status === 'removed' || body.status === 'pending'
    ? body.status
    : null
  if (!rowId || !status) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })

  const { data, error } = await sb
    .from('v2_session_songs')
    .update({ status })
    .eq('id', rowId)
    .eq('session_id', session.id)
    .select('id, status, title, submitted_by')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count } = await sb
    .from('v2_session_songs')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('status', 'approved')
  await sb.from('v2_sessions').update({ track_count: count || 0 }).eq('id', session.id)

  // Notify submitter on approve/remove (skip host acting on own submission)
  const submitterId = data.submitted_by as string | null
  if (submitterId && submitterId !== userId && (status === 'approved' || status === 'removed')) {
    const service = v2ServiceClient()
    const payload = {
      userId: submitterId,
      sessionId: session.id,
      sessionTitle: session.title as string,
      songTitle: (data.title as string) || 'Your song',
    }
    await createCommunityNotification(
      service,
      status === 'approved'
        ? buildSessionSubmissionApproved(payload)
        : buildSessionSubmissionRemoved(payload),
    )
  }

  return NextResponse.json({ row: data })
}
