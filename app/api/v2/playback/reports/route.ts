import { NextRequest, NextResponse } from 'next/server'
import { requireV2User } from '@/lib/v2/apiAuth'
import { createPlaybackEngine } from '@/lib/playback/PlaybackEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb } = auth

  const body = await req.json().catch(() => ({}))
  const title = typeof body.title === 'string' ? body.title.trim() : 'Playback report'
  const contextType = typeof body.context_type === 'string' ? body.context_type : undefined
  const contextId = typeof body.context_id === 'string' ? body.context_id : undefined

  if (!contextType || !contextId) {
    return NextResponse.json({ error: 'context_required' }, { status: 400 })
  }

  try {
    const engine = createPlaybackEngine(sb)
    const report = await engine.generateReport({
      contextType: contextType as never,
      contextId,
      title,
      sessionId: typeof body.session_id === 'string' ? body.session_id : undefined,
      queueId: typeof body.queue_id === 'string' ? body.queue_id : undefined,
      playlistSnapshotId: typeof body.playlist_snapshot_id === 'string' ? body.playlist_snapshot_id : undefined,
      feedbackCount: typeof body.feedback_count === 'number' ? body.feedback_count : undefined,
      commentCount: typeof body.comment_count === 'number' ? body.comment_count : undefined,
    })
    return NextResponse.json({ report })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'report_failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
