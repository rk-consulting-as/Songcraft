export const SPOTIFY_OAUTH_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-recently-played',
  'playlist-read-private',
  'playlist-read-collaborative',
] as const

export type SpotifyConnectionStatus = 'connected' | 'needs_reconnect' | 'revoked' | 'error'

export type SpotifyConnectionSafe = {
  connected: boolean
  spotifyUserId?: string
  displayName?: string
  email?: string
  scopes: string[]
  connectionStatus: SpotifyConnectionStatus
  lastSyncAt?: string
  lastError?: string
  expiresAt?: string
}

export type SpotifyAppStatus =
  | 'not_configured'
  | 'ready'
  | 'redirect_missing'

export function isSpotifyOAuthEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_SPOTIFY_CONNECTION_ENABLED === 'false') return false
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET)
}

export function getSpotifyRedirectUri(): string {
  const explicit = process.env.SPOTIFY_REDIRECT_URI?.trim()
  if (explicit) return explicit
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${(process.env.VERCEL_URL || '').replace(/^https?:\/\//, '')}`
    : 'http://localhost:3000'
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || base
  return `${origin}/api/v2/integrations/spotify/callback`
}

export function getSpotifyAppStatus(): SpotifyAppStatus {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return 'not_configured'
  if (!process.env.SPOTIFY_REDIRECT_URI && !process.env.NEXT_PUBLIC_APP_URL && !process.env.VERCEL_URL) {
    return 'redirect_missing'
  }
  return 'ready'
}

export const SPOTIFY_POLICY_COPY =
  'Spotify listening matches are based on the connected user\'s Recently Played history. They document listening activity but do not prove that Spotify counted an official stream or that playback originated from a particular playlist.'

export const SPOTIFY_CONNECT_EXPLAINER =
  'Connecting Spotify lets ViaTone read playlists you can access and compare your Recently Played history with active listening sessions. ViaTone does not receive official Spotify stream counts.'
