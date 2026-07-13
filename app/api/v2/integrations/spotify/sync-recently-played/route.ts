import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { syncAndMatchSpotifySession } from '@/lib/spotify/evidence'
import { trackSpotifyEvent } from '@/lib/spotify/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const sessionId = typeof body.session_id === 'string' ? body.session_id : ''
  if (!sessionId) return NextResponse.json({ error: 'session_id_required' }, { status: 400 })

  try {
    const pending = await syncAndMatchSpotifySession(v2ServiceClient(), userId, sessionId)
    if (pending?.matches.length) {
      await trackSpotifyEvent(sb, userId, 'spotify_evidence_detected', {
        session_id: sessionId,
        match_count: pending.matches.length,
        confidence: pending.confidence,
      })
    } else {
      await trackSpotifyEvent(sb, userId, 'spotify_recently_played_synced', { session_id: sessionId })
    }
    return NextResponse.json({ pending })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'sync_failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
