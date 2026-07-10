import type { SupabaseClient } from '@supabase/supabase-js'
import { v2ServiceClient } from '@/lib/v2/apiAuth'

export type CommunityAnalyticsEventType =
  | 'community_public_view'
  | 'community_follow'
  | 'community_save'
  | 'community_signup_cta'
  | 'community_rsvp_after_signup'
  | 'community_invite_landing'

export type CommunityAnalyticsPayload = {
  eventType: CommunityAnalyticsEventType
  entityType?: 'circle' | 'session' | 'playlist_room' | 'host' | 'explore'
  entityId?: string
  source?: string
  ref?: string
  metadata?: Record<string, unknown>
}

/** Server-side community analytics insert — no PII in aggregates. */
export async function trackCommunityEvent(
  sb: SupabaseClient | null,
  payload: CommunityAnalyticsPayload,
): Promise<void> {
  try {
    const client = sb || v2ServiceClient()
    await client.from('analytics_events').insert({
      event_type: payload.eventType,
      source: (payload.source || 'community').slice(0, 80),
      metadata: {
        entity_type: payload.entityType || null,
        entity_id: payload.entityId || null,
        ref: payload.ref || null,
        ...(payload.metadata || {}),
      },
    })
  } catch {
    // best-effort
  }
}
