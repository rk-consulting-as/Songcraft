import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getSpotifyConnectionRow,
  markSpotifyConnectionError,
  readTokensFromRow,
  saveRefreshedTokens,
} from './connections'
import { refreshSpotifyToken } from './oauth'

export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public retryAfter?: number,
  ) {
    super(message)
    this.name = 'SpotifyApiError'
  }
}

export async function getUserSpotifyAccessToken(sb: SupabaseClient, userId: string): Promise<string> {
  const row = await getSpotifyConnectionRow(sb, userId)
  if (!row || row.connection_status === 'revoked') {
    throw new SpotifyApiError('spotify_not_connected', 401, 'not_connected')
  }

  const tokens = readTokensFromRow(row)
  const stillValid = tokens.expiresAt.getTime() > Date.now() + 60_000
  if (stillValid) return tokens.accessToken

  try {
    const refreshed = await refreshSpotifyToken(tokens.refreshToken)
    await saveRefreshedTokens(sb, userId, refreshed.access_token, refreshed.expires_in, refreshed.refresh_token)
    return refreshed.access_token
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 400 || status === 401) {
      await markSpotifyConnectionError(sb, userId, 'needs_reconnect', 'refresh_token_revoked')
      throw new SpotifyApiError('spotify_needs_reconnect', 401, 'needs_reconnect')
    }
    throw e
  }
}

export async function spotifyUserFetch(
  sb: SupabaseClient,
  userId: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = await getUserSpotifyAccessToken(sb, userId)
  let res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  })

  if (res.status === 401) {
    token = await getUserSpotifyAccessToken(sb, userId)
    res = await fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
    })
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') || '60')
    throw new SpotifyApiError('spotify_rate_limited', 429, 'rate_limited', retryAfter)
  }

  return res
}

export async function parseSpotifyError(res: Response): Promise<never> {
  let msg = `spotify_${res.status}`
  let code: string | undefined
  try {
    const data = await res.json()
    msg = data?.error?.message || msg
    code = data?.error?.status?.toString() || data?.error?.message
  } catch {}
  if (res.status === 403) throw new SpotifyApiError(msg, 403, 'forbidden')
  throw new SpotifyApiError(msg, res.status, code)
}
