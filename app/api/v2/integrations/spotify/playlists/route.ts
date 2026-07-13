import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { fetchUserSpotifyPlaylists } from '@/lib/spotify/playlistApi'
import { isSpotifyOAuthEnabled } from '@/lib/spotify/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isSpotifyOAuthEnabled()) {
    return NextResponse.json({ error: 'spotify_not_configured' }, { status: 503 })
  }
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const search = req.nextUrl.searchParams.get('q') || undefined
  const sb = v2ServiceClient()
  try {
    const playlists = await fetchUserSpotifyPlaylists(sb, auth.userId, { search, limit: 50 })
    return NextResponse.json({ playlists })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'playlist_fetch_failed'
    const status = msg.includes('not_connected') || msg.includes('reconnect') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
