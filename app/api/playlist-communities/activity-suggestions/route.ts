import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import {
  approveSuggestion,
  fetchPendingSuggestions,
  ignoreSuggestion,
} from '@/lib/passiveParticipation/suggestions'
import { syncUserLastfmPassive } from '@/lib/passiveParticipation/syncLastfm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  try {
    await syncUserLastfmPassive(auth.sb, auth.userId)
  } catch {
    /* sync optional on load */
  }

  const suggestions = await fetchPendingSuggestions(auth.sb, auth.userId)
  return NextResponse.json({ suggestions })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')

  if (action === 'sync') {
    try {
      const result = await syncUserLastfmPassive(auth.sb, auth.userId, { force: body.force === true })
      const suggestions = await fetchPendingSuggestions(auth.sb, auth.userId)
      return NextResponse.json({ ...result, suggestions })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'sync_failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  if (action === 'approve' && body.suggestion_id) {
    const result = await approveSuggestion(auth.sb, auth.userId, String(body.suggestion_id))
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'approve_failed' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'ignore' && body.suggestion_id) {
    const result = await ignoreSuggestion(auth.sb, auth.userId, String(body.suggestion_id))
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}
