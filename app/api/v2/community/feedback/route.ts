import { NextRequest, NextResponse } from 'next/server'
import { clipText, requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REACTIONS = new Set(['fire', 'love', 'idea', 'clap'])

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const songId = typeof body.song_id === 'string' ? body.song_id : ''
  if (!songId) return NextResponse.json({ error: 'song_id_required' }, { status: 400 })

  const rating = typeof body.rating === 'number' ? Math.min(5, Math.max(1, Math.round(body.rating))) : null
  const reaction = REACTIONS.has(body.reaction) ? body.reaction : null
  const text = clipText(body.body, 2000)
  if (!text && !rating && !reaction) return NextResponse.json({ error: 'feedback_empty' }, { status: 400 })

  const row = {
    song_id: songId,
    from_user_id: userId,
    circle_id: typeof body.circle_id === 'string' ? body.circle_id : null,
    session_id: typeof body.session_id === 'string' ? body.session_id : null,
    rating,
    body: text || null,
    reaction,
  }

  const { data, error } = await sb.from('v2_song_feedback').insert(row).select('id, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedback: data })
}

export async function GET(req: NextRequest) {
  const songId = req.nextUrl.searchParams.get('song_id')
  if (!songId) return NextResponse.json({ error: 'song_id_required' }, { status: 400 })

  const sb = v2ServiceClient()
  const { data: rows } = await sb
    .from('v2_song_feedback')
    .select('id, song_id, from_user_id, rating, body, reaction, created_at, circle_id, session_id')
    .eq('song_id', songId)
    .order('created_at', { ascending: false })
    .limit(50)

  const userIds = Array.from(new Set((rows || []).map(r => r.from_user_id)))
  let nameById: Record<string, string> = {}
  if (userIds.length) {
    const { data: profiles } = await sb.from('profiles').select('id, display_name').in('id', userIds)
    nameById = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name || 'Member']))
  }

  const feedback = (rows || []).map(r => ({
    id: r.id,
    songId: r.song_id,
    fromUserId: r.from_user_id,
    fromUserName: nameById[r.from_user_id] || 'Member',
    rating: r.rating,
    body: r.body,
    reaction: r.reaction,
    createdAt: r.created_at,
    circleId: r.circle_id,
    sessionId: r.session_id,
  }))

  return NextResponse.json({ feedback })
}
