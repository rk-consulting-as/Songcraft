import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force Node.js runtime so the crypto module is fully available (Edge runtime has only
// a subset of Node APIs and would break createHash).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

// Lazy-load crypto so a bad runtime doesn't crash the module before we reach the handler.
function hashIp(ip: string | null): string | null {
  if (!ip) return null
  try {
    const crypto = require('crypto') as typeof import('crypto')
    const salt = process.env.IP_HASH_SALT || 'songcraft-default-salt'
    return crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 32)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    return await handlePlay(req)
  } catch (e: any) {
    // Always return JSON with the actual error so the client/console can see it.
    console.error('[song/play] route crashed:', e?.message, e?.stack)
    return NextResponse.json({
      error: 'play_handler_crashed',
      message: e?.message || String(e),
    }, { status: 500 })
  }
}

async function handlePlay(req: NextRequest) {
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

  // Insert the play log. If the table doesn't exist, return a clear error instead of 500.
  let playId: string | null = null
  {
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
      console.error('[song/play] song_plays insert failed:', insertErr)
      return NextResponse.json({
        error: 'song_plays_insert_failed',
        message: insertErr.message,
        hint: insertErr.message?.includes('does not exist')
          ? 'song_plays table missing — run migration 20260516_song_plays.sql'
          : insertErr.hint,
      }, { status: 500 })
    }
    playId = play.id
  }

  // If listener is logged in, try to award points via the RPC. Non-fatal if RPC missing.
  let awarded = 0
  if (listenerId) {
    try {
      const { data: awardData, error: awardErr } = await sbAnon.rpc('award_listen_points', {
        p_listener_id: listenerId,
        p_song_id: songId,
        p_source: source,
        p_completed: completed,
        p_duration: durationListened,
        p_song_duration: songDuration,
      })
      if (awardErr) {
        console.warn('[song/play] award_listen_points failed (non-fatal):', awardErr.message)
      } else {
        awarded = Number(awardData || 0)
        if (awarded > 0 && playId) {
          await sbAnon.from('song_plays').update({ points_awarded: awarded }).eq('id', playId)
        }
      }
    } catch (e: any) {
      console.warn('[song/play] award_listen_points threw (non-fatal):', e?.message)
    }
  }

  return NextResponse.json({
    ok: true,
    play_id: playId,
    points_awarded: awarded,
  })
}
