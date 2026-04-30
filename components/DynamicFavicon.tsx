'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * Replaces the page's favicon with the logged-in user's studio_pages.favicon_url
 * if they have one set. No-op for anonymous users.
 *
 * Mounted in the root layout so it runs on every page in the logged-in app.
 * Public pages (/p/{slug}, /studio/{slug}) set their own favicon via Next.js
 * metadata, which renders into the HTML head before this client component runs —
 * so this component will overwrite that with the user's preference if they're
 * logged in. To keep public-page favicons stable for anonymous visitors, this
 * component skips updates when there's no auth session.
 */
export default function DynamicFavicon() {
  useEffect(() => {
    let cancelled = false

    const setFavicon = (href: string) => {
      // Remove any existing icon links so we don't end up with multiple.
      document.querySelectorAll('link[rel*="icon"]').forEach(el => el.parentElement?.removeChild(el))
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = href
      document.head.appendChild(link)
    }

    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || !session) return
      const { data } = await supabase.from('studio_pages')
        .select('favicon_url')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (data?.favicon_url) setFavicon(data.favicon_url)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return null
}
