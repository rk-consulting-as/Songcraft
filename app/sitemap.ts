import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { absoluteAppUrl } from '@/lib/appUrl'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = absoluteAppUrl('')
  if (!base) return []

  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteAppUrl('/discover'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteAppUrl('/creators'), lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: absoluteAppUrl('/charts'), lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: absoluteAppUrl('/login'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  const sb = serviceClient()

  const { data: artists } = await sb
    .from('artists')
    .select('id, page_slug, created_at, page_settings')
    .eq('page_enabled', true)
    .eq('admin_hidden', false)
    .not('page_slug', 'is', null)
    .limit(500)

  const artistRoutes: MetadataRoute.Sitemap = (artists || []).map(a => ({
    url: absoluteAppUrl(`/p/${a.page_slug}`),
    lastModified: a.created_at ? new Date(a.created_at) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const epkRoutes: MetadataRoute.Sitemap = (artists || [])
    .filter(a => {
      const epk = (a.page_settings as { epk?: { public_enabled?: boolean } })?.epk
      return !!epk?.public_enabled
    })
    .map(a => ({
      url: absoluteAppUrl(`/epk/${a.page_slug}`),
      lastModified: a.created_at ? new Date(a.created_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

  const artistIds = (artists || []).map(a => a.id)
  let songRoutes: MetadataRoute.Sitemap = []
  if (artistIds.length > 0) {
    const { data: songs } = await sb
      .from('songs')
      .select('id, created_at')
      .in('artist_id', artistIds)
      .eq('public_hidden', false)
      .eq('admin_hidden', false)
      .limit(2000)

    songRoutes = (songs || []).map(s => ({
      url: absoluteAppUrl(`/s/${s.id}`),
      lastModified: new Date(s.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }))
  }

  return [...staticRoutes, ...artistRoutes, ...epkRoutes, ...songRoutes]
}
