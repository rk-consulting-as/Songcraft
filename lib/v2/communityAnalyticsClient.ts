import type { CommunityAnalyticsEventType } from '@/lib/v2/communityAnalytics'

export type CommunityClientAnalyticsPayload = {
  eventType: CommunityAnalyticsEventType
  entityType?: 'circle' | 'session' | 'playlist_room' | 'host' | 'explore'
  entityId?: string
  source?: string
  ref?: string
  metadata?: Record<string, unknown>
}

export function trackCommunityClientEvent(payload: CommunityClientAnalyticsPayload) {
  if (typeof window === 'undefined') return

  const body = JSON.stringify({
    ...payload,
    metadata: {
      page_path: `${window.location.pathname}${window.location.search}`,
      ...(payload.metadata || {}),
    },
  })

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/v2/community/analytics/event', new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {}

  fetch('/api/v2/community/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}
