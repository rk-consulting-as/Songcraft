'use client'
import { createClient } from '@/lib/supabase'

/**
 * Anchor that fires a /api/link/click log before opening the external URL.
 * Use this for any outbound social/streaming link on public song/artist pages.
 */
export default function TrackableLink({
  href,
  songId,
  artistId,
  targetType,
  sourcePage,
  children,
  style,
  className,
  title,
}: {
  href: string
  songId?: string
  artistId?: string
  targetType?: string
  sourcePage?: string
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  title?: string
}) {
  const handleClick = async (e: React.MouseEvent) => {
    // Don't intercept opening — let browser handle normal target=_blank navigation.
    // We just fire-and-forget the tracking call.
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      // Use sendBeacon if available for reliable tracking on navigation
      const payload = JSON.stringify({
        song_id: songId || null,
        artist_id: artistId || null,
        target_url: href,
        target_type: targetType,
        source_page: sourcePage || (typeof window !== 'undefined' ? window.location.pathname : ''),
      })
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/link/click', blob)
      } else {
        fetch('/api/link/click', {
          method: 'POST',
          headers,
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {}
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      style={style}
      className={className}
      title={title}
    >
      {children}
    </a>
  )
}
