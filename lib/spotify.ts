// Server-side helpers for Spotify Web API (Client Credentials flow).
// Used by all routes under /api/spotify.

let cachedToken: { token: string; expires: number } | null = null

async function fetchNewToken(): Promise<string> {
  const cid = process.env.SPOTIFY_CLIENT_ID
  const sec = process.env.SPOTIFY_CLIENT_SECRET
  if (!cid || !sec) {
    console.error('[spotify] SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing in env')
    throw new Error('SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is not set on the server')
  }
  // Trim accidentally-included whitespace/quotes from env (common Vercel paste mistake).
  const cleanCid = cid.trim().replace(/^['"]|['"]$/g, '')
  const cleanSec = sec.trim().replace(/^['"]|['"]$/g, '')
  console.log(`[spotify] Token request — client_id="${cleanCid.slice(0, 8)}..." (len ${cleanCid.length}), secret len ${cleanSec.length}`)

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(cleanCid + ':' + cleanSec).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[spotify] Token endpoint rejected credentials:', res.status, data)
    throw new Error(`Spotify auth failed: ${res.status} ${data.error_description || data.error || ''}`)
  }
  if (!data.access_token) {
    console.error('[spotify] Token endpoint returned 200 but no access_token:', data)
    throw new Error('Spotify returned no access_token')
  }
  console.log(`[spotify] Got token, expires_in=${data.expires_in}s, token_type=${data.token_type}`)
  cachedToken = {
    token: data.access_token,
    // Expire 60s early so we never use a token in its last second.
    expires: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedToken.token
}

export async function getSpotifyToken(forceFresh = false): Promise<string> {
  if (!forceFresh && cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token
  }
  return fetchNewToken()
}

/** Drop the cached token. Call this when Spotify returns 401. */
export function invalidateSpotifyToken() {
  cachedToken = null
}

/**
 * Wrapper around fetch() that auto-retries once with a fresh token if Spotify returns 401.
 * Use this from any route that calls Spotify Web API endpoints.
 *
 * Logs to server console so issues are visible in `npm run dev` output.
 */
export async function spotifyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getSpotifyToken()
  let res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    console.warn('[spotifyFetch] 401 with cached token — invalidating and refreshing')
    invalidateSpotifyToken()
    token = await getSpotifyToken(true)
    res = await fetch(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) {
      console.error('[spotifyFetch] STILL 401 after fresh token — likely invalid SPOTIFY_CLIENT_ID/SECRET')
    } else {
      console.log('[spotifyFetch] retry succeeded with fresh token')
    }
  }
  return res
}
