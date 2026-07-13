import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptToken, encryptToken } from './tokenCrypto'
import { SPOTIFY_OAUTH_SCOPES, type SpotifyConnectionSafe, type SpotifyConnectionStatus } from './config'

export type SpotifyTokenBundle = {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scopes: string[]
}

type ConnectionRow = {
  id: string
  user_id: string
  spotify_user_id: string
  spotify_display_name: string | null
  spotify_email: string | null
  access_token_encrypted: string
  refresh_token_encrypted: string
  expires_at: string
  scopes: string[]
  connection_status: SpotifyConnectionStatus
  last_sync_at: string | null
  last_error: string | null
}

function mapSafe(row: ConnectionRow): SpotifyConnectionSafe {
  return {
    connected: row.connection_status === 'connected',
    spotifyUserId: row.spotify_user_id,
    displayName: row.spotify_display_name || undefined,
    email: row.spotify_email || undefined,
    scopes: row.scopes || [],
    connectionStatus: row.connection_status,
    lastSyncAt: row.last_sync_at || undefined,
    lastError: row.last_error || undefined,
    expiresAt: row.expires_at,
  }
}

export async function getSpotifyConnectionRow(sb: SupabaseClient, userId: string): Promise<ConnectionRow | null> {
  const { data } = await sb.from('v2_spotify_connections').select('*').eq('user_id', userId).maybeSingle()
  return data as ConnectionRow | null
}

export async function getSpotifyConnectionSafe(sb: SupabaseClient, userId: string): Promise<SpotifyConnectionSafe> {
  const row = await getSpotifyConnectionRow(sb, userId)
  if (!row) return { connected: false, scopes: [], connectionStatus: 'revoked' }
  return mapSafe(row)
}

export async function upsertSpotifyConnection(
  sb: SupabaseClient,
  userId: string,
  input: {
    spotifyUserId: string
    displayName?: string
    email?: string
    accessToken: string
    refreshToken: string
    expiresInSeconds: number
    scopes?: string[]
  },
): Promise<SpotifyConnectionSafe> {
  const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000).toISOString()
  const { data, error } = await sb
    .from('v2_spotify_connections')
    .upsert({
      user_id: userId,
      spotify_user_id: input.spotifyUserId,
      spotify_display_name: input.displayName || null,
      spotify_email: input.email || null,
      access_token_encrypted: encryptToken(input.accessToken),
      refresh_token_encrypted: encryptToken(input.refreshToken),
      expires_at: expiresAt,
      scopes: input.scopes || [...SPOTIFY_OAUTH_SCOPES],
      connection_status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapSafe(data as ConnectionRow)
}

export async function deleteSpotifyConnection(sb: SupabaseClient, userId: string): Promise<void> {
  await sb.from('v2_spotify_connections').delete().eq('user_id', userId)
  await sb.from('v2_spotify_play_dedup').delete().eq('user_id', userId)
}

export async function markSpotifyConnectionError(
  sb: SupabaseClient,
  userId: string,
  status: SpotifyConnectionStatus,
  message: string,
): Promise<void> {
  await sb.from('v2_spotify_connections').update({
    connection_status: status,
    last_error: message.slice(0, 500),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
}

export async function touchSpotifySync(sb: SupabaseClient, userId: string): Promise<void> {
  await sb.from('v2_spotify_connections').update({
    last_sync_at: new Date().toISOString(),
    last_error: null,
    connection_status: 'connected',
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)
}

export function readTokensFromRow(row: ConnectionRow): SpotifyTokenBundle {
  return {
    accessToken: decryptToken(row.access_token_encrypted),
    refreshToken: decryptToken(row.refresh_token_encrypted),
    expiresAt: new Date(row.expires_at),
    scopes: row.scopes || [],
  }
}

export async function saveRefreshedTokens(
  sb: SupabaseClient,
  userId: string,
  accessToken: string,
  expiresInSeconds: number,
  refreshToken?: string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    access_token_encrypted: encryptToken(accessToken),
    expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    connection_status: 'connected',
    last_error: null,
    updated_at: new Date().toISOString(),
  }
  if (refreshToken) patch.refresh_token_encrypted = encryptToken(refreshToken)
  await sb.from('v2_spotify_connections').update(patch).eq('user_id', userId)
}
