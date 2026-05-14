import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

/**
 * POST /api/song/play
 *
 * Body: {
 *   song_id: string                  (required)
 *   source: 'internal' | 'spotify_embed' | 'youtube_embed' | 'soundcloud_embed' | 'apple_embed'
 *   duration_listened: number        (seconds, only relevant for internal)
 *   song_duration?: number           (total song length in seconds, for completeness ratio)
 *   completed?: boolean              (true if listener heard the whole thing)
 * }
 *
 * Anonymous plays are accepted (counter still increments). Points only awarded to
 * authenticated listeners that aren't the song owner, with a daily cap.
 */

const sbAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

const VALID_SOURCES = new Set([
  'internal',
  'spotify_embed',
  'youtube_embed',
  'soundcloud_embed',
  'apple_embed',
])

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  const salt = process.env.IP_HASH_SALT || 'songcraft-default-salt'
  return createHash('sha256').update(ip + salt).digest('hex').slice(0, 32)
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const songId = String(body?.song_id || '').trim()
  const source = String(body?.source || '').trim()
  const durationListened = Math.max(0, Math.floor(Number(body?.duration_listened) || 0))
  const songDuration = Math.max(0, Math.floor(Number(body?.song_duration) || 0))
  const completed = !!body?.completed

  if (!songId)              return NextResponse.json({ error: 'Missing song_id' }, { status: 400 })
  if (!VALID_SOURCES.has(source)) return NextResponse.json({ error: 'Invalid source' }, { status: 400 })

  // Minimum thresholds — anti-spam:
  //   - Internal plays need at least 5s listened (otherwise it was a button mash)
  //   - Embed clicks always log (single-shot, no duration tracked)
  if (source === 'internal' && durationListened < 5) {
    return NextResponse.json({ ok: true, skipped: 'too_short' })
  }

  // Verify the song exists and is reachable. Using anon client respects RLS, so:
  //   - For internal plays of public/featured songs, RLS lets us read them
  //   - For private songs being played by the owner via /artist/[id], we need authed client.
  // Pragmatic: just check existence using anon. If not visible, skip silently.
  const { data: song } = await sbAnon
    .from('songs')
    .select('id, user_id')
    .eq('id', songId)
    .maybeSingle()
  if (!song) {
    return NextResponse.json({ ok: true, skipped: 'song_not_visible' })
  }

  // Identify the listener (if logged in). We read the bearer token from cookies via
  // a Supabase server client. For simplicity here, we use the anon client and have
  // the frontend pass a Bearer-equipped header — or we can just rely on auth.uid()
  // being null for anon.
  let listenerId: string | null = null
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const sbAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
      )
      const { data: { user } } = await sbAuth.auth.getUser()
      listenerId = user?.id || null
    } catch (e) {
      console.warn('[song/play] auth check failed:', e)
    }
  }

  // Capture hashed IP for abuse detection (NOT identifying, but allows rate-limit per IP)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const ipHash = hashIp(ip)

  // Insert the play log
  const { data: play, error: insertErr } = await sbAnon
    .from('song_plays')
    .insert({
      song_id: songId,
      listener_id: listenerId,
      source,
      duration_listened_seconds: durationListened,
      completed,
      points_awarded: 0,
      ip_hash: ipHash,
    })
    .select('id')
    .single()
  if (insertErr) {
    console.error('[song/play] insert failed:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // If listener is logged in, try to award points via the RPC.
  let awarded = 0
  if (listenerId) {
    const { data: awardData, error: awardErr } = await sbAnon.rpc('award_listen_points', {
      p_listener_id: listenerId,
      p_song_id: songId,
      p_source: source,
      p_completed: completed,
      p_duration: durationListened,
      p_song_duration: songDuration,
    })
    if (awardErr) {
      console.warn('[song/play] award_listen_points failed:', awardErr.message)
    } else {
      awarded = Number(awardData || 0)
      // Update the play row with how many points were given (informational)
      if (awarded > 0) {
        await sbAnon.from('song_plays').update({ points_awarded: awarded }).eq('id', play.id)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    play_id: play.id,
    points_awarded: awarded,
  })
}
