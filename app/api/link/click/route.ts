import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/link/click
// Body: { song_id?, artist_id?, target_url, target_type, source_page? }
// Fire-and-forget click logger. Anon plays are accepted.

function detectTarget(url: string): string {
  const u = url.toLowerCase()
  if (u.includes('spotify.com'))      return 'spotify'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('music.apple.com'))  return 'apple_music'
  if (u.includes('soundcloud.com'))   return 'soundcloud'
  if (u.includes('suno.com'))         return 'suno'
  if (u.includes('tiktok.com'))       return 'tiktok'
  if (u.includes('instagram.com'))    return 'instagram'
  if (u.includes('facebook.com'))     return 'facebook'
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter'
  if (/^https?:\/\//.test(u))         return 'website'
  return 'other'
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  try {
    const crypto = require('crypto') as typeof import('crypto')
    const salt = process.env.IP_HASH_SALT || 'songcraft-default-salt'
    return crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 32)
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'bad_json' }, { status: 400 })

    const songId = body?.song_id ? String(body.song_id) : null
    const artistId = body?.artist_id ? String(body.artist_id) : null
    const targetUrl = String(body?.target_url || '').trim()
    const sourcePage = body?.source_page ? String(body.source_page).slice(0, 200) : null

    if (!targetUrl) return NextResponse.json({ error: 'missing_target_url' }, { status: 400 })
    if (!songId && !artistId) return NextResponse.json({ error: 'missing_target_id' }, { status: 400 })

    const targetType = body?.target_type ? String(body.target_type) : detectTarget(targetUrl)

    // Identify clicker if Bearer present
    let clickerId: string | null = null
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
        clickerId = user?.id || null
      } catch {}
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const ipHash = hashIp(ip)

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { error } = await sb.from('link_clicks').insert({
      song_id: songId,
      artist_id: artistId,
      target_url: targetUrl.slice(0, 500),
      target_type: targetType,
      source_page: sourcePage,
      clicker_id: clickerId,
      ip_hash: ipHash,
    })
    if (error) {
      console.warn('[link/click] insert failed:', error.message)
      return NextResponse.json({ error: 'insert_failed', message: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'crashed', message: e?.message }, { status: 500 })
  }
}
