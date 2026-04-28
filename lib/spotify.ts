// Server-side helpers for Spotify Web API (Client Credentials flow).
// Used by /api/spotify (search) and /api/spotify/tracks (top tracks import).

let cachedToken: { token: string; expires: number } | null = null

export async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(
        process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
      ).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`)
  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    // Expire 60s early so we never use a token in its last second.
    expires: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedToken.token
}
