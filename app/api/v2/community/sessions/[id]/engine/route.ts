import { NextRequest, NextResponse } from 'next/server'
import { clipText, requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { canManageSessionHost } from '@/lib/v2/hostAccess'
import { parseStreamMeta } from '@/lib/v2/data/streamEngine'
import { createManyCommunityNotifications } from '@/lib/v2/data/communityNotifications'
import { buildSessionCompleted, buildSessionStarted } from '@/lib/v2/communityNotifications'
import { notifyHostFollowersSessionLive, notifySavedSessionUsers } from '@/lib/v2/data/followNotifications'
import type { V2NotificationInput } from '@/lib/v2/types'

async function notifyJoinedMembers(
  sessionId: string,
  sessionTitle: string,
  hostUserId: string,
  build: (p: { userId: string; sessionId: string; sessionTitle: string }) => V2NotificationInput,
) {
  const service = v2ServiceClient()
  const { data: members } = await service
    .from('v2_session_participation')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('status', 'joined')

  const inputs = (members || [])
    .map(m => m.user_id as string)
    .filter(uid => uid && uid !== hostUserId)
    .map(uid => build({ userId: uid, sessionId, sessionTitle }))

  await createManyCommunityNotifications(service, inputs)
}

async function fetchSessionTitle(sessionId: string): Promise<string> {
  const { data } = await v2ServiceClient().from('v2_sessions').select('title').eq('id', sessionId).maybeSingle()
  return (data?.title as string) || 'Session'
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveSession(idOrSlug: string) {
  const sb = v2ServiceClient()
  return sb
    .from('v2_sessions')
    .select('id, host_user_id, status, stream_engine_meta')
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle()
}

async function nextUnplayedSong(sb: ReturnType<typeof v2ServiceClient>, sessionId: string) {
  const { data } = await sb
    .from('v2_session_songs')
    .select('id')
    .eq('session_id', sessionId)
    .eq('status', 'approved')
    .is('played_at', null)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id as string | undefined
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: session } = await resolveSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const canHost = await canManageSessionHost(sb, userId, session.host_user_id)
  if (!canHost) return NextResponse.json({ error: 'host_only' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : ''
  const meta = parseStreamMeta(session.stream_engine_meta)

  if (action === 'start') {
    await sb.from('v2_sessions').update({ status: 'live' }).eq('id', session.id)
    const nextId = await nextUnplayedSong(sb, session.id)
    if (nextId) {
      await sb.from('v2_session_songs').update({ is_now_playing: false }).eq('session_id', session.id)
      await sb.from('v2_session_songs').update({ is_now_playing: true }).eq('id', nextId)
    }
    const title = await fetchSessionTitle(session.id)
    await notifyJoinedMembers(session.id, title, session.host_user_id, buildSessionStarted)
    await notifyHostFollowersSessionLive({ hostUserId: session.host_user_id, sessionId: session.id, sessionTitle: title })
    await notifySavedSessionUsers({ sessionId: session.id, sessionTitle: title, kind: 'live', hostUserId: session.host_user_id })
    return NextResponse.json({ ok: true, status: 'live' })
  }

  if (action === 'end') {
    const notes = meta.host_notes || []
    await sb.from('v2_sessions').update({
      status: 'ended',
      stream_engine_meta: { ...meta, completed_at: new Date().toISOString(), host_notes: notes },
    }).eq('id', session.id)
    await sb.from('v2_session_songs').update({ is_now_playing: false }).eq('session_id', session.id)
    const title = await fetchSessionTitle(session.id)
    await notifyJoinedMembers(session.id, title, session.host_user_id, buildSessionCompleted)
    return NextResponse.json({ ok: true, status: 'ended' })
  }

  if (action === 'add_note') {
    const note = clipText(body.note, 500)
    if (!note) return NextResponse.json({ error: 'note_required' }, { status: 400 })
    const hostNotes = [...(meta.host_notes || []), note]
    await sb.from('v2_sessions').update({
      stream_engine_meta: { ...meta, host_notes: hostNotes },
    }).eq('id', session.id)
    return NextResponse.json({ ok: true, host_notes: hostNotes })
  }

  if (action === 'mark_played' || action === 'skip') {
    const rowId = typeof body.row_id === 'string' ? body.row_id : null
    let targetId = rowId

    if (!targetId) {
      const { data: current } = await sb
        .from('v2_session_songs')
        .select('id')
        .eq('session_id', session.id)
        .eq('is_now_playing', true)
        .maybeSingle()
      targetId = current?.id
    }

    if (action === 'mark_played' && targetId) {
      const { data: row } = await sb
        .from('v2_session_songs')
        .select('id, song_id, title, artist_name')
        .eq('id', targetId)
        .maybeSingle()

      if (row) {
        const now = new Date().toISOString()
        await sb.from('v2_session_play_logs').insert({
          session_id: session.id,
          session_song_id: row.id,
          song_id: row.song_id,
          played_by: userId,
          played_at: now,
          source: 'manual_host',
          note: clipText(body.note, 300) || null,
        })
        await sb.from('v2_session_songs').update({ played_at: now, is_now_playing: false }).eq('id', row.id)
      }
    } else if (action === 'skip' && targetId) {
      await sb.from('v2_session_songs').update({ is_now_playing: false }).eq('id', targetId)
    }

    const nextId = await nextUnplayedSong(sb, session.id)
    if (nextId) {
      await sb.from('v2_session_songs').update({ is_now_playing: true }).eq('id', nextId)
    }

    return NextResponse.json({ ok: true, next_song_id: nextId || null })
  }

  if (action === 'bump_next') {
    const rowId = typeof body.row_id === 'string' ? body.row_id : null
    if (!rowId) return NextResponse.json({ error: 'row_id_required' }, { status: 400 })

    const { data: row } = await sb.from('v2_session_songs').select('position').eq('id', rowId).maybeSingle()
    if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const newPos = Math.max(1, row.position - 1)
    await sb.from('v2_session_songs').update({ position: row.position }).eq('session_id', session.id).eq('position', newPos)
    await sb.from('v2_session_songs').update({ position: newPos }).eq('id', rowId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}
