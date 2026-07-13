import { NextRequest, NextResponse } from 'next/server'
import { requireV2User } from '@/lib/v2/apiAuth'
import { createPlaybackEngine } from '@/lib/playback/PlaybackEngine'
import { listSessionEvidence } from '@/lib/playback/PlaylistSnapshot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(_req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb } = auth

  const engine = createPlaybackEngine(sb)
  const session = await engine.getSession(params.id)
  if (!session) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const evidence = await listSessionEvidence(sb, params.id)
  return NextResponse.json({ session, evidence })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb } = auth

  const body = await req.json().catch(() => ({}))
  const action = body.action === 'finish' ? 'finish' : 'finish'

  try {
    const engine = createPlaybackEngine(sb)
    if (action === 'finish') {
      const result = await engine.completeSession(params.id)
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'finish_failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
