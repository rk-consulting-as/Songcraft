import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clip(value: unknown, max: number): string | null {
  const s = typeof value === 'string' ? value.trim() : ''
  return s ? s.slice(0, max) : null
}

function normalizeSource(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (raw === 'qr') return 'qr'
  if (raw === 'direct' || raw === 'referral' || raw === 'social') return raw
  return raw ? raw.slice(0, 80) : 'unknown'
}

function isDuplicate(error: any) {
  return error?.code === '23505' || /duplicate|unique/i.test(error?.message || '')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'bad_json' }, { status: 400 })

    const artistId = String(body.artist_id || '')
    const email = String(body.email || '').trim().toLowerCase()
    const name = clip(body.name, 120)
    const favoriteSong = clip(body.favorite_song, 160)
    const sourcePage = clip(body.source_page, 200)
    const source = normalizeSource(body.source)

    if (!UUID_RE.test(artistId)) return NextResponse.json({ error: 'invalid_artist' }, { status: 400 })
    if (!EMAIL_RE.test(email) || email.length > 254) return NextResponse.json({ error: 'invalid_email' }, { status: 400 })

    const service = serviceClient()
    if (service) {
      const { data: setting } = await service
        .from('admin_platform_settings')
        .select('value')
        .eq('key', 'public_signup')
        .maybeSingle()
      if (setting?.value?.enabled === false) return NextResponse.json({ error: 'signup_disabled' }, { status: 403 })
    }

    const { error } = await sb.from('newsletter_subscribers').insert({
      artist_id: artistId,
      email,
      name,
      favorite_song: favoriteSong,
      source_page: sourcePage,
      source,
      confirmed: false,
    })

    if (error) {
      if (isDuplicate(error)) {
        return NextResponse.json({ ok: true, already_subscribed: true })
      }
      console.warn('[newsletter/signup] insert failed:', error.message)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }

    await sb.from('analytics_events').insert({
      artist_id: artistId,
      event_type: 'newsletter_signup',
      source,
      user_agent: clip(req.headers.get('user-agent'), 500),
      referrer: clip(body.referrer || req.headers.get('referer'), 500),
      metadata: {
        ...(sourcePage ? { source_page: sourcePage } : {}),
        ...(favoriteSong ? { favorite_song: favoriteSong } : {}),
      },
    })

    return NextResponse.json({ ok: true, already_subscribed: false })
  } catch (e: any) {
    console.error('[newsletter/signup] crashed:', e?.message)
    return NextResponse.json({ error: 'crashed' }, { status: 500 })
  }
}
