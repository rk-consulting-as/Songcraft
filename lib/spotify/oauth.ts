import { getSpotifyRedirectUri, SPOTIFY_OAUTH_SCOPES } from './config'
import { signOAuthState } from './tokenCrypto'

export type SpotifyTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type?: string
}

export type SpotifyProfile = {
  id: string
  display_name?: string
  email?: string
}

function clientAuthHeader(): string {
  const cid = process.env.SPOTIFY_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, '')
  const sec = process.env.SPOTIFY_CLIENT_SECRET?.trim().replace(/^['"]|['"]$/g, '')
  if (!cid || !sec) throw new Error('spotify_not_configured')
  return 'Basic ' + Buffer.from(`${cid}:${sec}`).toString('base64')
}

export function buildSpotifyAuthorizeUrl(userId: string, returnTo: string): string {
  const payload = Buffer.from(JSON.stringify({
    u: userId,
    r: returnTo.slice(0, 200),
    t: Date.now(),
  })).toString('base64url')
  const state = signOAuthState(payload)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID!.trim(),
    scope: SPOTIFY_OAUTH_SCOPES.join(' '),
    redirect_uri: getSpotifyRedirectUri(),
    state,
    show_dialog: 'false',
  })
  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

export async function exchangeSpotifyCode(code: string): Promise<SpotifyTokenResponse> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: clientAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getSpotifyRedirectUri(),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `spotify_token_exchange_${res.status}`)
  }
  return data as SpotifyTokenResponse
}

export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokenResponse> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: clientAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error_description || data.error || `spotify_refresh_${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return data as SpotifyTokenResponse
}

export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyProfile> {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `spotify_profile_${res.status}`)
  return { id: data.id, display_name: data.display_name, email: data.email }
}

export function parseOAuthStatePayload(payload: string): { userId: string; returnTo: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed?.u) return null
    return { userId: String(parsed.u), returnTo: String(parsed.r || '/community/settings/integrations') }
  } catch {
    return null
  }
}
