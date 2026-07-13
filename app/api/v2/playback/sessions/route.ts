import { NextRequest, NextResponse } from 'next/server'
import { requireV2User } from '@/lib/v2/apiAuth'
import { createPlaybackEngine } from '@/lib/playback/PlaybackEngine'
import type { PlaybackPlatform } from '@/lib/playback/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PLATFORMS = new Set<PlaybackPlatform>([
  'spotify', 'youtube', 'apple', 'tidal', 'deezer', 'soundcloud', 'amazon', 'viatone', 'mixed',
])

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const platform = PLATFORMS.has(body.platform) ? body.platform : 'mixed'
  const playlistSnapshotId = typeof body.playlist_snapshot_id === 'string' ? body.playlist_snapshot_id : undefined
  const contextType = typeof body.context_type === 'string' ? body.context_type : undefined
  const contextId = typeof body.context_id === 'string' ? body.context_id : undefined
  const queueId = typeof body.queue_id === 'string' ? body.queue_id : undefined

  try {
    const engine = createPlaybackEngine(sb)
    const session = await engine.startSession({
      userId,
      platform,
      playlistSnapshotId,
      contextType: contextType as never,
      contextId,
      queueId,
    })
    return NextResponse.json({ session })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'start_failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
