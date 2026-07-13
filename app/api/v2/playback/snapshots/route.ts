import { NextRequest, NextResponse } from 'next/server'
import { requireV2User } from '@/lib/v2/apiAuth'
import { createPlaybackEngine } from '@/lib/playback/PlaybackEngine'
import type { CreateSnapshotInput, PlaybackPlatform, PlaylistSnapshotTrack } from '@/lib/playback/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })

  const platform = (typeof body.platform === 'string' ? body.platform : 'mixed') as PlaybackPlatform
  const tracks = Array.isArray(body.tracks) ? body.tracks as PlaylistSnapshotTrack[] : []

  const input: CreateSnapshotInput = {
    platform,
    externalPlaylistId: typeof body.external_playlist_id === 'string' ? body.external_playlist_id : undefined,
    name,
    description: typeof body.description === 'string' ? body.description : undefined,
    coverImageUrl: typeof body.cover_image_url === 'string' ? body.cover_image_url : undefined,
    ownerUserId: userId,
    tracks,
    linkedContextType: body.linked_context_type,
    linkedContextId: typeof body.linked_context_id === 'string' ? body.linked_context_id : undefined,
  }

  try {
    const engine = createPlaybackEngine(sb)
    const snapshot = await engine.linkPlaylistSnapshot(input)
    return NextResponse.json({ snapshot })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'snapshot_failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
