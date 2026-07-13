import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { deleteSpotifyConnection, getSpotifyConnectionSafe } from '@/lib/spotify/connections'
import { getSpotifyAppStatus, isSpotifyOAuthEnabled } from '@/lib/spotify/config'
import { listUserSpotifyEvidenceStats } from '@/lib/spotify/evidence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const connection = await getSpotifyConnectionSafe(sb, userId)
  const stats = await listUserSpotifyEvidenceStats(sb, userId)

  return NextResponse.json({
    enabled: isSpotifyOAuthEnabled(),
    appStatus: getSpotifyAppStatus(),
    connection,
    stats,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  if (body.action === 'disconnect') {
    await deleteSpotifyConnection(v2ServiceClient(), userId)
    return NextResponse.json({ ok: true, disconnected: true })
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}
