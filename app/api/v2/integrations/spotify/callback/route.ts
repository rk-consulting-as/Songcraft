import { NextRequest, NextResponse } from 'next/server'
import { v2ServiceClient } from '@/lib/v2/apiAuth'
import { upsertSpotifyConnection } from '@/lib/spotify/connections'
import {
  exchangeSpotifyCode,
  fetchSpotifyProfile,
  parseOAuthStatePayload,
} from '@/lib/spotify/oauth'
import { verifyOAuthState } from '@/lib/spotify/tokenCrypto'
import { isSpotifyOAuthEnabled } from '@/lib/spotify/config'
import { trackSpotifyEvent } from '@/lib/spotify/analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const error = req.nextUrl.searchParams.get('error')
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') || ''
  const fallback = '/community/settings/integrations'

  if (error) {
    return NextResponse.redirect(`${fallback}?spotify_error=${encodeURIComponent(error)}`)
  }
  if (!isSpotifyOAuthEnabled() || !code) {
    return NextResponse.redirect(`${fallback}?spotify_error=not_configured`)
  }

  const verified = verifyOAuthState(state)
  if (!verified.valid || !verified.payload) {
    return NextResponse.redirect(`${fallback}?spotify_error=invalid_state`)
  }

  const parsed = parseOAuthStatePayload(verified.payload)
  if (!parsed) {
    return NextResponse.redirect(`${fallback}?spotify_error=invalid_state`)
  }

  try {
    const tokens = await exchangeSpotifyCode(code)
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${parsed.returnTo}?spotify_error=missing_refresh_token`)
    }
    const profile = await fetchSpotifyProfile(tokens.access_token)
    const sb = v2ServiceClient()
    await upsertSpotifyConnection(sb, parsed.userId, {
      spotifyUserId: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSeconds: tokens.expires_in,
      scopes: tokens.scope?.split(' ') || undefined,
    })
    await trackSpotifyEvent(sb, parsed.userId, 'spotify_connect_completed', {})
    return NextResponse.redirect(`${parsed.returnTo}?spotify_connected=1`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'connect_failed'
    await trackSpotifyEvent(v2ServiceClient(), parsed.userId, 'spotify_connect_failed', { error: msg })
    return NextResponse.redirect(`${parsed.returnTo}?spotify_error=${encodeURIComponent(msg)}`)
  }
}
