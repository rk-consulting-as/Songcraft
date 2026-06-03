import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

const EVENT_TYPES = new Set([
  'artist_page_view', 'song_page_view', 'newsletter_signup', 'embed_view', 'embed_click',
  'story_view', 'story_song_click',
])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function safeMetadata(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, any> = {}
  for (const [key, raw] of Object.entries(value as Record<string, any>).slice(0, 20)) {
    const safeKey = key.slice(0, 80)
    if (typeof raw === 'string') out[safeKey] = raw.slice(0, 300)
    else if (typeof raw === 'number' || typeof raw === 'boolean' || raw === null) out[safeKey] = raw
  }
  return out
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'bad_json' }, { status: 400 })

    const eventType = String(body.event_type || '')
    if (!EVENT_TYPES.has(eventType)) return NextResponse.json({ error: 'bad_event_type' }, { status: 400 })

    const artistId = body.artist_id && UUID_RE.test(String(body.artist_id)) ? String(body.artist_id) : null
    const songId = body.song_id && UUID_RE.test(String(body.song_id)) ? String(body.song_id) : null
    const meta = safeMetadata(body.metadata)
    const storyIdRaw = body.story_id || meta.story_id
    const storyId = storyIdRaw && UUID_RE.test(String(storyIdRaw)) ? String(storyIdRaw) : null
    if (!artistId && !songId) return NextResponse.json({ error: 'missing_target' }, { status: 400 })
    if (eventType === 'artist_page_view' && !artistId) return NextResponse.json({ error: 'missing_artist' }, { status: 400 })
    if (eventType === 'song_page_view' && !songId) return NextResponse.json({ error: 'missing_song' }, { status: 400 })
    if ((eventType === 'embed_view' || eventType === 'embed_click') && !songId) return NextResponse.json({ error: 'missing_song' }, { status: 400 })
    if ((eventType === 'story_view' || eventType === 'story_song_click') && (!artistId || !storyId)) {
      return NextResponse.json({ error: 'missing_story' }, { status: 400 })
    }
    if (eventType === 'story_song_click' && !songId) return NextResponse.json({ error: 'missing_song' }, { status: 400 })

    const userAgent = clip(req.headers.get('user-agent'), 500)
    const referrer = clip(body.referrer || req.headers.get('referer'), 500)
    const source = normalizeSource(body.source)
    const storySource = eventType === 'story_view' || eventType === 'story_song_click' ? 'story' : source

    const { error } = await sb.from('analytics_events').insert({
      artist_id: artistId,
      song_id: songId,
      event_type: eventType,
      source: storySource,
      user_agent: userAgent,
      referrer,
      metadata: { ...meta, ...(storyId ? { story_id: storyId } : {}) },
    })

    if (error) {
      console.warn('[public-analytics/event] insert failed:', error.message)
      return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[public-analytics/event] crashed:', e?.message)
    return NextResponse.json({ error: 'crashed' }, { status: 500 })
  }
}
