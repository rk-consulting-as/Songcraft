import type { CreatorIdentity, CreatorIdentityStats, CreatorLevel, CreatorPageSettings } from './types'
import { resolvePublicAchievements } from './achievements'

const LEVEL_KEYS: Record<CreatorLevel, string> = {
  beginner: 'creatorLevelBeginner',
  emerging: 'creatorLevelEmerging',
  active: 'creatorLevelActive',
  advanced: 'creatorLevelAdvanced',
}

export function computeCreatorLevel(stats: CreatorIdentityStats): CreatorLevel {
  const composite =
    stats.growthScorePercent * 0.5 +
    Math.min(stats.profileCompletionPercent, 100) * 0.3 +
    Math.min(stats.publicReleaseCount * 20, 40)

  if (composite >= 75 && stats.publicReleaseCount > 0) return 'advanced'
  if (composite >= 50) return 'active'
  if (composite >= 25 || stats.hasPublicPage) return 'emerging'
  return 'beginner'
}

export function computeProfileCompletion(artist: {
  description?: string | null
  genre?: string | null
  avatar_url?: string | null
  spotify_image_url?: string | null
  social_links?: Record<string, { url?: string } | null> | null
  page_enabled?: boolean | null
  page_slug?: string | null
}, publicSongCount: number): number {
  let score = 0
  if (artist.avatar_url || artist.spotify_image_url) score += 20
  if (artist.description && artist.description.trim().length > 20) score += 20
  if (artist.genre?.trim()) score += 15
  const hasSocial = artist.social_links && Object.values(artist.social_links).some(l => !!(l as { url?: string })?.url)
  if (hasSocial) score += 15
  if (artist.page_enabled && artist.page_slug) score += 20
  if (publicSongCount > 0) score += 10
  return Math.min(100, score)
}

export function computeGrowthScoreFromStats(stats: Omit<CreatorIdentityStats, 'growthScorePercent'>): number {
  let score = 0
  if (stats.hasPublicPage) score += 20
  if (stats.publicSongCount > 0) score += 15
  if (stats.publicReleaseCount > 0) score += 15
  if (stats.hasEpk) score += 10
  if (stats.hasCampaign) score += 10
  if (stats.subscriberCount > 0) score += 15
  if (stats.clickCount >= 10) score += 10
  if (stats.clickCount >= 100) score += 5
  return Math.min(100, score)
}

export function buildCreatorIdentityStats(input: {
  artist: {
    page_enabled?: boolean | null
    page_slug?: string | null
    page_settings?: CreatorPageSettings | null
    description?: string | null
    genre?: string | null
    avatar_url?: string | null
    spotify_image_url?: string | null
    social_links?: Record<string, { url?: string } | null> | null
  }
  songs: { status?: string | null; public_hidden?: boolean | null; publish_content?: Record<string, unknown> | null }[]
  clickCount?: number
  subscriberCount?: number
}): CreatorIdentityStats {
  const publicSongs = input.songs.filter(s => !s.public_hidden)
  const publicReleaseCount = publicSongs.filter(
    s => s.status === 'released' || !!(s as { spotify_url?: string }).spotify_url
  ).length
  const settings = (input.artist.page_settings || {}) as CreatorPageSettings
  const hasEpk = !!(settings.epk?.public_enabled && (settings.epk.short_bio || settings.epk.long_bio))
  const hasCampaign = publicSongs.some(s => {
    const pc = s.publish_content || {}
    const timeline = Array.isArray((pc as { campaign_timeline?: unknown[] }).campaign_timeline)
      ? (pc as { campaign_timeline: unknown[] }).campaign_timeline
      : []
    return timeline.length > 0 || !!(pc as { distribution?: unknown }).distribution
  })

  const base = {
    publicReleaseCount,
    publicSongCount: publicSongs.length,
    profileCompletionPercent: computeProfileCompletion(input.artist, publicSongs.length),
    clickCount: input.clickCount || 0,
    subscriberCount: input.subscriberCount || 0,
    hasEpk,
    hasCampaign,
    hasPublicPage: !!(input.artist.page_enabled && input.artist.page_slug),
  }

  return {
    ...base,
    growthScorePercent: computeGrowthScoreFromStats(base),
  }
}

export function buildCreatorIdentity(input: {
  artist: Parameters<typeof buildCreatorIdentityStats>[0]['artist'] & { created_at?: string }
  songs: Parameters<typeof buildCreatorIdentityStats>[0]['songs']
  clickCount?: number
  subscriberCount?: number
  tx: Record<string, string>
}): CreatorIdentity {
  const stats = buildCreatorIdentityStats(input)
  const level = computeCreatorLevel(stats)
  const settings = (input.artist.page_settings || {}) as CreatorPageSettings

  return {
    level,
    levelLabelKey: LEVEL_KEYS[level],
    profileCompletionPercent: stats.profileCompletionPercent,
    publicReleaseCount: stats.publicReleaseCount,
    growthScorePercent: stats.growthScorePercent,
    achievements: resolvePublicAchievements(stats, input.tx),
    memberSince: settings.show_member_since !== false ? input.artist.created_at || null : null,
  }
}

export function getFeaturedRelease(
  settings: CreatorPageSettings | null | undefined,
  songs: { id: string; title: string; cover_image_url?: string | null; spotify_cover_url?: string | null; public_hidden?: boolean | null }[],
  albums: { id: string; title: string; cover_url?: string | null; cover_image_url?: string | null }[]
) {
  const ref = settings?.featured_release
  if (!ref?.id) return null
  if (ref.type === 'song') {
    const song = songs.find(s => s.id === ref.id && !s.public_hidden)
    if (!song) return null
    return {
      type: 'song' as const,
      id: song.id,
      title: song.title,
      coverUrl: song.cover_image_url || song.spotify_cover_url || null,
      href: `/s/${song.id}`,
    }
  }
  const album = albums.find(a => a.id === ref.id)
  if (!album) return null
  return {
    type: 'album' as const,
    id: album.id,
    title: album.title,
    coverUrl: album.cover_url || album.cover_image_url || null,
    href: null as string | null,
  }
}

export type ResolvedFeaturedRelease = {
  type: 'song' | 'album'
  id: string
  title: string
  coverUrl: string | null
  href: string | null
  isFallback?: boolean
}

/** Featured release from settings, or latest public released song as fallback. */
export function resolveFeaturedOrLatestSong(
  settings: CreatorPageSettings | null | undefined,
  songs: {
    id: string
    title: string
    status?: string | null
    public_hidden?: boolean | null
    cover_image_url?: string | null
    spotify_cover_url?: string | null
    suno_url?: string | null
    backstory?: string | null
    spotify_url?: string | null
  }[],
  albums: { id: string; title: string; cover_url?: string | null; cover_image_url?: string | null }[]
): ResolvedFeaturedRelease | null {
  const featured = getFeaturedRelease(settings, songs, albums)
  if (featured?.type === 'song' && featured.href) {
    return { ...featured, isFallback: false }
  }
  if (featured?.type === 'album') {
    return { ...featured, isFallback: false }
  }

  const released = songs.filter(s => !s.public_hidden && (s.status === 'released' || s.suno_url))
  const latest = released[0]
  if (!latest) return featured ? { ...featured, isFallback: false } : null

  return {
    type: 'song',
    id: latest.id,
    title: latest.title,
    coverUrl: latest.cover_image_url || latest.spotify_cover_url || null,
    href: `/s/${latest.id}`,
    isFallback: true,
  }
}
