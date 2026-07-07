import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function resolveCircle(slug: string) {
  const sb = v2ServiceClient()
  return sb.from('v2_circles').select('id, slug, name, visibility').eq('slug', slug).maybeSingle()
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const songId = typeof body.song_id === 'string' ? body.song_id : ''
  if (!songId) return NextResponse.json({ error: 'song_id_required' }, { status: 400 })

  const { data: circle } = await resolveCircle(params.slug)
  if (!circle) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (circle.visibility !== 'public') return NextResponse.json({ error: 'circle_not_public' }, { status: 403 })

  const { data: member } = await sb
    .from('v2_circle_members')
    .select('id')
    .eq('circle_id', circle.id)
    .eq('user_id', userId)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: 'join_circle_first' }, { status: 403 })

  const { data: song } = await sb.from('songs').select('id, user_id').eq('id', songId).maybeSingle()
  if (!song || song.user_id !== userId) return NextResponse.json({ error: 'song_not_owned' }, { status: 403 })

  const { data, error } = await sb
    .from('v2_circle_songs')
    .upsert({
      circle_id: circle.id,
      song_id: songId,
      submitted_by: userId,
      status: 'pending',
    }, { onConflict: 'circle_id,song_id' })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submission: data })
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const sb = v2ServiceClient()
  const { data: circle } = await resolveCircle(params.slug)
  if (!circle) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: rows } = await sb
    .from('v2_circle_songs')
    .select('id, song_id, status, created_at, songs(id, title, artist_id, cover_image_url, spotify_cover_url, artists(name))')
    .eq('circle_id', circle.id)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
    .limit(48)

  return NextResponse.json({ submissions: rows || [] })
}
