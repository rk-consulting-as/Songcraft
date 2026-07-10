/**
 * Public visibility audit rules — documentation-as-code for beta QA.
 * Activity proof / private campaign data must never appear on public surfaces.
 */

export type VisibilityAuditRule = {
  id: string
  surface: string
  route: string
  filters: string[]
  status: 'implemented' | 'review'
  notes: string
}

export const PUBLIC_VISIBILITY_AUDIT: VisibilityAuditRule[] = [
  {
    id: 'discover',
    surface: 'Discover catalog',
    route: '/discover, /api/discover/catalog',
    filters: ['artists.admin_hidden = false', 'songs.public_hidden = false', 'songs.admin_hidden = false', 'campaigns.visibility = public', 'campaigns.admin_hidden = false', 'campaign status open/active'],
    status: 'implemented',
    notes: 'No private media or activity proof in API response.',
  },
  {
    id: 'artist_page',
    surface: 'Public artist page',
    route: '/p/[slug]',
    filters: ['page_enabled = true', 'admin_hidden = false'],
    status: 'implemented',
    notes: 'Returns 404 for hidden artists.',
  },
  {
    id: 'song_page',
    surface: 'Public song page',
    route: '/s/[id]',
    filters: ['artist.page_enabled', 'artist.admin_hidden = false', 'song.public_hidden = false'],
    status: 'implemented',
    notes: 'OG metadata only when page is public.',
  },
  {
    id: 'epk',
    surface: 'EPK',
    route: '/epk/[artistSlug]',
    filters: ['page_enabled', 'admin_hidden = false', 'epk.public_enabled'],
    status: 'implemented',
    notes: 'EPK songs filtered via epkSongs publicOnly.',
  },
  {
    id: 'playlist_campaign',
    surface: 'Playlist campaign',
    route: '/playlist-campaigns/[id]',
    filters: ['public visibility + open/active OR member/owner', 'activity proof requires auth + membership', 'RLS on campaign_activity_logs'],
    status: 'implemented',
    notes: 'Private campaigns return not_found for anonymous users.',
  },
  {
    id: 'sitemap',
    surface: 'Sitemap',
    route: '/sitemap.xml',
    filters: ['page_enabled artists only', 'public songs only'],
    status: 'implemented',
    notes: 'Review app/sitemap.ts when adding new public routes.',
  },
  {
    id: 'og_metadata',
    surface: 'Open Graph / metadata',
    route: 'generateMetadata on public routes',
    filters: ['Same guards as page render — no metadata for hidden content'],
    status: 'implemented',
    notes: 'metadataBase warning is env-only, not a visibility leak.',
  },
  {
    id: 'media_private',
    surface: 'Media assets',
    route: 'media_assets RLS',
    filters: ['visibility = private not in public_select policy', 'activity_proof type private by default'],
    status: 'implemented',
    notes: 'Only owner + admin can read private assets.',
  },
  {
    id: 'v2_community_explore',
    surface: 'ViaTone Community explore',
    route: '/community/explore',
    filters: ['v2_circles.visibility = public', 'sessions joined to public circles', 'playlist rooms joined to public circles', 'service-role explicit filters'],
    status: 'implemented',
    notes: 'Logged-out landing; no mock data on public discovery queries.',
  },
  {
    id: 'v2_community_public_entities',
    surface: 'Public community entities',
    route: '/community/circles/[slug], /community/sessions/[id], /community/playlists/[slug], /community/hosts/[id]',
    filters: ['circle visibility = public OR member/owner', 'default deny for private/invite', 'approved songs/queue only for anon', 'no participation notes or private feedback'],
    status: 'implemented',
    notes: 'Restricted state without leaking private circle content.',
  },
  {
    id: 'v2_community_sitemap',
    surface: 'Community sitemap',
    route: '/sitemap.xml',
    filters: ['public circles only', 'public upcoming/live sessions only', 'public playlist rooms only', 'public host profiles with content'],
    status: 'implemented',
    notes: 'See fetchPublicSitemapEntries in lib/v2/data/publicDiscovery.ts',
  },
]
