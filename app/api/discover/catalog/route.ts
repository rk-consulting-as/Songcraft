import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  buildCreatorIdentity,
  buildCreatorIdentityStats,
  getFeaturedRelease,
  type CreatorPageSettings,
} from '@/lib/creatorIdentity'
import {
  aggregateAnalyticsEvents,
  computeTrendingScore,
  mergeLinkClicks,
} from '@/lib/discover/trending'
import type { DiscoverCatalog, DiscoverEpk, DiscoverGenreChip, DiscoverRelease } from '@/lib/discover/types'
import type { DiscoverCreatorCardData } from '@/lib/creatorIdentity/types'
import { isPublicDiscoverArtist, isPublicDiscoverSong } from '@/lib/discover/publicFilters'

export const dynamic = 'force-dynamic'
export const revalidate = 300

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}

const TX_EN: Record<string, string> = {
  achievementPublicLaunch: 'Public Launch',
  achievementFirstRelease: 'First Release',
  achievementFirstFan: 'First Fan',
  achievement100Clicks: '100 Clicks',
  achievementGrowthStarter: 'Growth Starter',
  achievementCampaignBuilder: 'Campaign Builder',
  achievementEpkPublished: 'EPK Published',
  achievementBadgeLive: 'Live',
  achievementBadgeReleased: 'Released',
  achievementBadgeFan: 'Fan',
  achievementBadge100: '100+',
  achievementBadgeStarter: 'Starter',
  achievementBadgeCampaign: 'Campaign',
  achievementBadgeEpk: 'EPK',
  creatorLevelBeginner: 'Beginner',
  creatorLevelEmerging: 'Emerging',
  creatorLevelActive: 'Active',
  creatorLevelAdvanced: 'Advanced',
}

export async function GET() {
  const sb = serviceClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: artists, error: artistsErr } = await sb
    .from('artists')
    .select('id, name, genre, description, avatar_url, spotify_image_url, social_links, page_enabled, page_slug, page_settings, admin_hidden, created_at')
    .eq('page_enabled', true)
    .eq('admin_hidden', false)
    .not('page_slug', 'is', null)
    .order('created_at', { ascending: false })
    .limit(120)

  if (artistsErr) {
    return NextResponse.json({ error: 'Failed to load artists' }, { status: 500 })
  }

  const publicArtists = (artists || []).filter(isPublicDiscoverArtist)
  const artistIds = publicArtists.map(a => a.id)
  if (artistIds.length === 0) {
    const empty: DiscoverCatalog = {
      trending: [],
      newReleases: [],
      featured: [],
      recentlyActive: [],
      genres: [],
      epks: [],
      generatedAt: new Date().toISOString(),
    }
    return NextResponse.json(empty)
  }

  const [{ data: songs }, { data: albums }, { data: events }, { data: linkRows }] = await Promise.all([
    sb
      .from('songs')
      .select('id, title, artist_id, status, cover_image_url, spotify_cover_url, spotify_url, spotify_release_date, public_hidden, admin_hidden, created_at, publish_content')
      .in('artist_id', artistIds)
      .eq('public_hidden', false)
      .eq('admin_hidden', false),
    sb.from('albums').select('id, title, artist_id, cover_image_url, release_date').in('artist_id', artistIds),
    sb
      .from('analytics_events')
      .select('artist_id, event_type, source')
      .in('artist_id', artistIds)
      .gte('created_at', since)
      .limit(8000),
    sb.from('link_clicks').select('artist_id').in('artist_id', artistIds).gte('created_at', since).limit(8000),
  ])

  const songsByArtist: Record<string, typeof songs> = {}
  for (const s of songs || []) {
    if (!songsByArtist[s.artist_id]) songsByArtist[s.artist_id] = []
    songsByArtist[s.artist_id]!.push(s)
  }

  const albumsByArtist: Record<string, typeof albums> = {}
  for (const a of albums || []) {
    if (!albumsByArtist[a.artist_id]) albumsByArtist[a.artist_id] = []
    albumsByArtist[a.artist_id]!.push(a)
  }

  const analyticsMap = aggregateAnalyticsEvents(events || [])
  const clickCounts: Record<string, number> = {}
  for (const row of linkRows || []) {
    if (row.artist_id) clickCounts[row.artist_id] = (clickCounts[row.artist_id] || 0) + 1
  }
  mergeLinkClicks(
    analyticsMap,
    Object.entries(clickCounts).map(([artist_id, count]) => ({ artist_id, count }))
  )

  const artistMap: Record<string, (typeof publicArtists)[0]> = {}
  for (const a of publicArtists) artistMap[a.id] = a

  const cards: DiscoverCreatorCardData[] = publicArtists.map(artist => {
    const artistSongs = (songsByArtist[artist.id] || []).filter(s =>
      isPublicDiscoverSong(s, artist)
    )
    const artistAlbums = albumsByArtist[artist.id] || []
    const counts = analyticsMap[artist.id]
    const trendingScore = counts ? computeTrendingScore(counts) : 0
    const stats = buildCreatorIdentityStats({
      artist,
      songs: artistSongs,
      clickCount: counts?.linkClicks || clickCounts[artist.id] || 0,
    })
    const identity = buildCreatorIdentity({
      artist,
      songs: artistSongs,
      clickCount: stats.clickCount,
      tx: TX_EN,
    })
    const settings = (artist.page_settings || {}) as CreatorPageSettings
    const featuredRaw = getFeaturedRelease(settings, artistSongs, artistAlbums)
    const featured = featuredRaw?.href ? featuredRaw : featuredRaw ? { ...featuredRaw, href: `/p/${artist.page_slug}` } : null

    return {
      id: artist.id,
      name: artist.name,
      slug: artist.page_slug!,
      genre: artist.genre,
      imageUrl: artist.spotify_image_url || artist.avatar_url,
      description: artist.description,
      level: identity.level,
      levelLabelKey: identity.levelLabelKey,
      profileCompletionPercent: identity.profileCompletionPercent,
      publicReleaseCount: identity.publicReleaseCount,
      publicSongCount: stats.publicSongCount,
      trendingScore,
      achievements: identity.achievements.filter(a => a.earned).slice(0, 4),
      featuredRelease: featured,
      memberSince: settings.show_member_since !== false ? artist.created_at : null,
      createdAt: artist.created_at,
    }
  })

  const trending = [...cards].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 12)
  const featured = [...cards]
    .filter(c => c.profileCompletionPercent >= 40 || c.publicReleaseCount > 0)
    .sort((a, b) => (b.trendingScore + b.profileCompletionPercent * 0.1) - (a.trendingScore + a.profileCompletionPercent * 0.1))
    .slice(0, 8)

  const recentlyActive = [...cards]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)

  const newReleases: DiscoverRelease[] = []
  for (const s of songs || []) {
    const artist = artistMap[s.artist_id]
    if (!artist || !isPublicDiscoverSong(s, artist)) continue
    const counts = analyticsMap[s.artist_id]
    newReleases.push({
      id: s.id,
      title: s.title,
      artistId: s.artist_id,
      artistName: artist.name,
      artistSlug: artist.page_slug,
      coverUrl: s.cover_image_url || s.spotify_cover_url,
      releaseDate: s.spotify_release_date,
      createdAt: s.created_at,
      href: `/s/${s.id}`,
      trendingScore: counts ? computeTrendingScore(counts) : 0,
    })
  }
  newReleases.sort((a, b) => {
    const da = a.releaseDate || a.createdAt
    const db = b.releaseDate || b.createdAt
    return new Date(db).getTime() - new Date(da).getTime()
  })

  const genreCounts: Record<string, number> = {}
  for (const c of cards) {
    if (!c.genre) continue
    for (const g of c.genre.split(',').map(x => x.trim()).filter(Boolean)) {
      genreCounts[g] = (genreCounts[g] || 0) + 1
    }
  }
  const genres: DiscoverGenreChip[] = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([genre, count]) => ({ genre, count }))

  const epks: DiscoverEpk[] = publicArtists
    .filter(a => {
      const settings = (a.page_settings || {}) as CreatorPageSettings
      return !!(settings.epk?.public_enabled && (settings.epk.short_bio || settings.epk.long_bio))
    })
    .slice(0, 8)
    .map(a => ({
      artistId: a.id,
      artistName: a.name,
      artistSlug: a.page_slug!,
      imageUrl: a.spotify_image_url || a.avatar_url,
      genre: a.genre,
      href: `/epk/${a.page_slug}`,
    }))

  const catalog: DiscoverCatalog = {
    trending,
    newReleases: newReleases.slice(0, 16),
    featured,
    recentlyActive,
    genres,
    epks,
    generatedAt: new Date().toISOString(),
  }

  return NextResponse.json(catalog, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
