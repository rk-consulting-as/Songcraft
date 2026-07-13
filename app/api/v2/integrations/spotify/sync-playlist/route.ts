import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { syncCuratorLinkedSpotifyPlaylist } from '@/lib/spotify/playlistSync'
import { summarizePlaylistDiff } from '@/lib/playback/providers/spotify/playlistDiff'
import { trackSpotifyEvent } from '@/lib/spotify/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const linkedPlaylistId = typeof body.linked_playlist_id === 'string' ? body.linked_playlist_id : ''
  if (!linkedPlaylistId) return NextResponse.json({ error: 'linked_playlist_id_required' }, { status: 400 })

  try {
    const result = await syncCuratorLinkedSpotifyPlaylist(v2ServiceClient(), userId, linkedPlaylistId)
    await trackSpotifyEvent(sb, userId, 'spotify_playlist_synced', {
      linked_playlist_id: linkedPlaylistId,
      snapshot_id: result.snapshotId,
      summary: summarizePlaylistDiff(result.diff),
    })
    return NextResponse.json({
      ...result,
      diffSummary: summarizePlaylistDiff(result.diff),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'sync_failed'
    await trackSpotifyEvent(sb, userId, 'spotify_playlist_sync_failed', { error: msg })
    const status = msg.includes('forbidden') ? 403 : msg.includes('reconnect') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
