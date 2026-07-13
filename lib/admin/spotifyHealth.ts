import type { SupabaseClient } from '@supabase/supabase-js'
import { getSpotifyAppStatus, getSpotifyRedirectUri, isSpotifyOAuthEnabled } from '@/lib/spotify/config'

export type SpotifyHealthReport = {
  configured: boolean
  appStatus: string
  redirectUri: string
  connectionTableExists: boolean
  activeConnections: number
  needsReconnect: number
  recentSyncFailures: number
  latestSuccessfulSync?: string
}

export async function buildSpotifyHealthReport(sb: SupabaseClient): Promise<SpotifyHealthReport> {
  const configured = isSpotifyOAuthEnabled()
  let connectionTableExists = false
  let activeConnections = 0
  let needsReconnect = 0
  let recentSyncFailures = 0
  let latestSuccessfulSync: string | undefined

  try {
    const { error: probe } = await sb.from('v2_spotify_connections').select('id').limit(1)
    connectionTableExists = !probe || !String(probe.message || '').includes('does not exist')

    if (connectionTableExists) {
      const [activeRes, reconnectRes, failRes, latestRes] = await Promise.all([
        sb.from('v2_spotify_connections').select('id', { count: 'exact', head: true }).eq('connection_status', 'connected'),
        sb.from('v2_spotify_connections').select('id', { count: 'exact', head: true }).eq('connection_status', 'needs_reconnect'),
        sb.from('v2_curator_linked_playlists').select('id', { count: 'exact', head: true }).in('sync_status', ['failed', 'forbidden']).gte('updated_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        sb.from('v2_spotify_connections').select('last_sync_at').eq('connection_status', 'connected').order('last_sync_at', { ascending: false }).limit(1),
      ])
      activeConnections = activeRes.count || 0
      needsReconnect = reconnectRes.count || 0
      recentSyncFailures = failRes.count || 0
      const latest = latestRes.data?.[0] as { last_sync_at?: string } | undefined
      latestSuccessfulSync = latest?.last_sync_at || undefined
    }
  } catch {
    connectionTableExists = false
  }

  return {
    configured,
    appStatus: getSpotifyAppStatus(),
    redirectUri: configured ? getSpotifyRedirectUri() : '',
    connectionTableExists,
    activeConnections,
    needsReconnect,
    recentSyncFailures,
    latestSuccessfulSync,
  }
}
