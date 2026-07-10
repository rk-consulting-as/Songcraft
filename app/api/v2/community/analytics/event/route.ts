import { NextRequest, NextResponse } from 'next/server'
import { trackCommunityEvent, type CommunityAnalyticsEventType } from '@/lib/v2/communityAnalytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EVENT_TYPES = new Set<CommunityAnalyticsEventType>([
  'community_public_view',
  'community_follow',
  'community_save',
  'community_signup_cta',
  'community_rsvp_after_signup',
  'community_invite_landing',
])

const ENTITY_TYPES = new Set(['circle', 'session', 'playlist_room', 'host', 'explore'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clip(value: unknown, max: number): string | undefined {
  const s = typeof value === 'string' ? value.trim() : ''
  return s ? s.slice(0, max) : undefined
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'bad_json' }, { status: 400 })

    const eventType = String(body.eventType || body.event_type || '') as CommunityAnalyticsEventType
    if (!EVENT_TYPES.has(eventType)) return NextResponse.json({ error: 'bad_event_type' }, { status: 400 })

    const entityType = typeof body.entityType === 'string' && ENTITY_TYPES.has(body.entityType)
      ? body.entityType
      : undefined
    const entityId = body.entityId && UUID_RE.test(String(body.entityId)) ? String(body.entityId) : undefined

    await trackCommunityEvent(null, {
      eventType,
      entityType,
      entityId,
      source: clip(body.source, 80),
      ref: clip(body.ref, 120),
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata as Record<string, unknown> : undefined,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'crashed' }, { status: 500 })
  }
}
