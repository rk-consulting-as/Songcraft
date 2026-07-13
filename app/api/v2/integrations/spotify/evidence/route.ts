import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { getPendingSpotifyEvidence, submitSpotifyEvidence } from '@/lib/spotify/evidence'
import { trackSpotifyEvent } from '@/lib/spotify/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'session_id_required' }, { status: 400 })

  const pending = await getPendingSpotifyEvidence(v2ServiceClient(), auth.userId, sessionId)
  return NextResponse.json({ pending })
}

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const pendingId = typeof body.pending_id === 'string' ? body.pending_id : ''
  const action = body.action === 'keep_private' || body.action === 'dismiss' ? body.action : 'submit'
  if (!pendingId) return NextResponse.json({ error: 'pending_id_required' }, { status: 400 })

  const result = await submitSpotifyEvidence(v2ServiceClient(), userId, pendingId, action)
  if (result.submitted) {
    await trackSpotifyEvent(sb, userId, 'spotify_evidence_submitted', { pending_id: pendingId })
  }
  return NextResponse.json(result)
}
