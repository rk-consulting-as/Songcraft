import type { SupabaseClient } from '@supabase/supabase-js'
import { v2ServiceClient } from '@/lib/v2/apiAuth'

export type SpotifyAnalyticsEvent =
  | 'spotify_connect_started'
  | 'spotify_connect_completed'
  | 'spotify_connect_failed'
  | 'spotify_playlist_linked'
  | 'spotify_playlist_synced'
  | 'spotify_playlist_sync_failed'
  | 'spotify_recently_played_synced'
  | 'spotify_evidence_detected'
  | 'spotify_evidence_submitted'

/** Safe Spotify product analytics — no tokens or track history in metadata. */
export async function trackSpotifyEvent(
  sb: SupabaseClient | null,
  userId: string | null,
  eventType: SpotifyAnalyticsEvent,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const client = sb || v2ServiceClient()
    await client.from('analytics_events').insert({
      event_type: eventType,
      source: 'spotify_integration',
      metadata: {
        ...(userId ? { user_id: userId } : {}),
        ...(metadata || {}),
      },
    })
  } catch {
    // best-effort
  }
}
