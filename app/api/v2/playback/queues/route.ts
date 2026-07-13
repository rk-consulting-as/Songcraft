import { NextRequest, NextResponse } from 'next/server'
import { requireV2User } from '@/lib/v2/apiAuth'
import { createPlaybackEngine } from '@/lib/playback/PlaybackEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : 'create'
  const engine = createPlaybackEngine(sb)

  try {
    if (action === 'create') {
      const name = typeof body.name === 'string' ? body.name : "Tonight's Queue"
      const snapshotIds = Array.isArray(body.snapshot_ids) ? body.snapshot_ids as string[] : []
      const queue = await engine.createQueue(userId, name, snapshotIds)
      return NextResponse.json({ queue })
    }

    const queueId = typeof body.queue_id === 'string' ? body.queue_id : ''
    if (!queueId) return NextResponse.json({ error: 'queue_id_required' }, { status: 400 })

    if (action === 'start') {
      const platform = body.platform || 'mixed'
      const result = await engine.startQueueListening(queueId, userId, platform)
      return NextResponse.json(result)
    }

    if (action === 'finish') {
      const result = await engine.finishQueueListening(queueId, userId)
      return NextResponse.json(result)
    }

    if (action === 'add') {
      const snapshotId = typeof body.snapshot_id === 'string' ? body.snapshot_id : ''
      if (!snapshotId) return NextResponse.json({ error: 'snapshot_id_required' }, { status: 400 })
      const queue = await engine.addToQueue(queueId, snapshotId)
      return NextResponse.json({ queue })
    }

    return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'queue_failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
