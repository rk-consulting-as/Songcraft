export type PublicAnalyticsEventType = 'artist_page_view' | 'song_page_view' | 'newsletter_signup'

export type PublicAnalyticsPayload = {
  artist_id?: string | null
  song_id?: string | null
  event_type: PublicAnalyticsEventType
  source?: string | null
  referrer?: string | null
  metadata?: Record<string, any>
}

export function detectPublicTrafficSource(): string {
  if (typeof window === 'undefined') return 'unknown'
  const params = new URLSearchParams(window.location.search)
  const src = (params.get('src') || params.get('source') || params.get('utm_source') || '').trim().toLowerCase()
  if (src === 'qr') return 'qr'
  if (src) return src.slice(0, 80)
  if (document.referrer) return 'referral'
  return 'direct'
}

export function currentPublicPath(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}`
}

export function trackPublicEvent(payload: PublicAnalyticsPayload) {
  if (typeof window === 'undefined') return

  const body = JSON.stringify({
    ...payload,
    source: payload.source || detectPublicTrafficSource(),
    referrer: payload.referrer ?? document.referrer ?? null,
    metadata: {
      page_path: currentPublicPath(),
      ...(payload.metadata || {}),
    },
  })

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/public-analytics/event', blob)
      return
    }
  } catch {}

  fetch('/api/public-analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}
