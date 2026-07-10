import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { absoluteAppUrl } from '@/lib/appUrl'
import { fetchPublicSitemapEntries } from '@/lib/v2/data/publicDiscovery'
import { V2_ROUTES } from '@/lib/v2/routes'

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
    { url: absoluteAppUrl(V2_ROUTES.explore), lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: absoluteAppUrl('/creators'), lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: absoluteAppUrl('/charts'), lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: absoluteAppUrl('/login'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  const sb = serviceClient()
  const communityPublic = await fetchPublicSitemapEntries()

  const communityRoutes: MetadataRoute.Sitemap = [
    ...communityPublic.circles.map(c => ({
      url: absoluteAppUrl(V2_ROUTES.circle(c.slug)),
      lastModified: c.updated_at ? new Date(c.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...communityPublic.sessions.map(s => ({
      url: absoluteAppUrl(V2_ROUTES.session(s.id)),
      lastModified: s.updated_at ? new Date(s.updated_at) : now,
      changeFrequency: 'daily' as const,
      priority: 0.72,
    })),
    ...communityPublic.rooms.map(r => ({
      url: absoluteAppUrl(V2_ROUTES.playlistRoom(r.slug)),
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.68,
    })),
    ...communityPublic.hosts.map(h => ({
      url: absoluteAppUrl(V2_ROUTES.hostProfile(h.id)),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    })),
  ]

  const sbLegacy = sb

  const { data: artists } = await sbLegacy
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
  let storyRoutes: MetadataRoute.Sitemap = []
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

    const slugByArtist = Object.fromEntries((artists || []).map(a => [a.id, a.page_slug]))
    const { data: stories } = await sb
      .from('artist_stories')
      .select('slug, artist_id, published_at, updated_at')
      .in('artist_id', artistIds)
      .in('status', ['published', 'scheduled'])
      .lte('published_at', new Date().toISOString())
      .not('published_at', 'is', null)
      .eq('public_hidden', false)
      .eq('admin_hidden', false)
      .limit(5000)

    storyRoutes = (stories || [])
      .map(st => {
        const slug = slugByArtist[st.artist_id]
        if (!slug) return null
        return {
          url: absoluteAppUrl(`/p/${slug}/stories/${st.slug}`),
          lastModified: new Date(st.published_at || st.updated_at),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }
      })
      .filter(Boolean) as MetadataRoute.Sitemap

    const storyIndexRoutes: MetadataRoute.Sitemap = (artists || [])
      .filter(a => (stories || []).some(st => st.artist_id === a.id))
      .map(a => ({
        url: absoluteAppUrl(`/p/${a.page_slug}/stories`),
        lastModified: a.created_at ? new Date(a.created_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.58,
      }))
    storyRoutes = [...storyRoutes, ...storyIndexRoutes]
  }

  return [...staticRoutes, ...communityRoutes, ...artistRoutes, ...epkRoutes, ...songRoutes, ...storyRoutes]
}
