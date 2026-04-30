'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * Replaces the page's favicon with the logged-in user's studio_pages.favicon_url
 * if they have one set. No-op for anonymous users.
 *
 * IMPORTANT: We don't touch React-managed favicon links (those set via Next.js metadata
 * on /p/[slug] and /studio/[slug] pages). Removing them would crash React's reconciler
 * with "Cannot read properties of null (reading 'removeChild')" when the route changes.
 *
 * Instead we APPEND our own marker-tagged <link> tag. Browsers use the last applicable
 * rel="icon" tag, so this overrides the React-managed one without removing it.
 */

const MARKER = 'data-songcraft-dynfavicon'

export default function DynamicFavicon() {
  useEffect(() => {
    let cancelled = false

    const setFavicon = (href: string) => {
      try {
        // Only remove OUR previously-injected node — leave React-managed icon links alone.
        document.querySelectorAll(`link[${MARKER}]`).forEach(el => {
          if (el.parentNode) el.parentNode.removeChild(el)
        })
        const link = document.createElement('link')
        link.rel = 'icon'
        link.href = href
        link.setAttribute(MARKER, '1')
        document.head.appendChild(link)
      } catch (e) {
        // Never let a DOM hiccup crash the page.
        console.warn('[DynamicFavicon] setFavicon error:', e)
      }
    }

    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled || !session) return
        const { data } = await supabase.from('studio_pages')
          .select('favicon_url')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (cancelled) return
        if (data?.favicon_url) setFavicon(data.favicon_url)
      } catch (e) {
        console.warn('[DynamicFavicon] load error:', e)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return null
}
