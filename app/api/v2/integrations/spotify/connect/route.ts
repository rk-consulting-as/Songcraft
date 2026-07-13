import { NextRequest, NextResponse } from 'next/server'
import { requireV2User, v2ServiceClient } from '@/lib/v2/apiAuth'
import { buildSpotifyAuthorizeUrl } from '@/lib/spotify/oauth'
import { isSpotifyOAuthEnabled } from '@/lib/spotify/config'
import { trackSpotifyEvent } from '@/lib/spotify/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isSpotifyOAuthEnabled()) {
    return NextResponse.json({ error: 'spotify_not_configured' }, { status: 503 })
  }
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const returnTo = req.nextUrl.searchParams.get('return_to') || '/community/settings/integrations'
  await trackSpotifyEvent(null, auth.userId, 'spotify_connect_started', { return_to: returnTo })
  const url = buildSpotifyAuthorizeUrl(auth.userId, returnTo)
  return NextResponse.redirect(url)
}
