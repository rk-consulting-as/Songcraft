import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { deleteSpotifyConnection } from '@/lib/spotify/connections'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  await deleteSpotifyConnection(v2ServiceClient(), auth.userId)
  return NextResponse.json({ ok: true, disconnected: true })
}
