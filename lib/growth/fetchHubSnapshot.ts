import { createClient } from '@/lib/supabase'
import { computePlaybookEngine } from '@/lib/playbook/computeEngine'
import { fetchPlaybookContext } from '@/lib/playbook/fetchContext'
import type { PlaybookEngineResult } from '@/lib/playbook/computeEngine'
import type { ActivitySuggestion, PassiveParticipationDigest } from '@/lib/passiveParticipation/types'
import type { UserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import {
  fetchActivitySuggestions,
  fetchCampaigns,
  fetchDiscoverCampaigns,
  fetchPassiveParticipation,
  fetchParticipationSummary,
} from '@/lib/playlistCommunities/client'
import type { Lang } from '@/lib/i18n'

export type GrowthHubSnapshot = {
  engine: PlaybookEngineResult
  participation: UserParticipationSummary | null
  ownedCampaigns: CampaignCardData[]
  joinedCampaigns: CampaignCardData[]
  discoverCampaigns: CampaignCardData[]
  suggestions: ActivitySuggestion[]
  digest: PassiveParticipationDigest | null
  pageViews: number
  artistId: string | null
  artistName: string | null
  artistGenre: string | null
  artists: { id: string; name: string }[]
  fanStats: {
    subscribers: number
    qrClicks: number
    embedViews: number
    linkClicks: number
  }
}

export async function fetchGrowthHubSnapshot(
  artistId: string | null | undefined,
  lang: Lang
): Promise<GrowthHubSnapshot | null> {
  const ctx = await fetchPlaybookContext(artistId)
  if (!ctx) return null

  const resolvedArtistId = artistId || ctx.selectedArtistId || ctx.artists[0]?.id || null
  const artist = ctx.artists.find(a => a.id === resolvedArtistId) || ctx.artists[0] || null

  const engine = computePlaybookEngine(ctx, lang, ctx.planId || 'free')

  const [
    participationRes,
    ownedRes,
    joinedRes,
    suggestionsRes,
    digestRes,
    discoverLooking,
    discoverTrending,
  ] = await Promise.all([
    fetchParticipationSummary().catch(() => null),
    fetchCampaigns({ artistId: resolvedArtistId || undefined, scope: 'owned' }).catch(() => null),
    fetchCampaigns({ artistId: resolvedArtistId || undefined, scope: 'joined' }).catch(() => null),
    fetchActivitySuggestions().catch(() => null),
    fetchPassiveParticipation('digest').catch(() => null),
    fetchDiscoverCampaigns({ sort: 'newest', lookingForMembers: true }).catch(() => null),
    fetchDiscoverCampaigns({
      sort: 'trending',
      genre: artist?.genre?.split(',')[0]?.trim() || undefined,
    }).catch(() => null),
  ])

  const discoverMap = new Map<string, CampaignCardData>()
  for (const c of [...(discoverLooking?.campaigns || []), ...(discoverTrending?.campaigns || [])]) {
    if (!discoverMap.has(c.id)) discoverMap.set(c.id, c)
  }
  const discoverCampaigns = Array.from(discoverMap.values()).slice(0, 6)

  let pageViews = 0
  const artistIds = resolvedArtistId ? [resolvedArtistId] : ctx.artists.map(a => a.id)
  if (artistIds.length) {
    const sb = createClient()
    const { count } = await sb
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .in('artist_id', artistIds)
      .in('event_type', ['artist_page_view', 'song_page_view'])
    pageViews = count || 0
  }

  return {
    engine,
    participation: participationRes?.summary || null,
    ownedCampaigns: (ownedRes?.campaigns || []) as CampaignCardData[],
    joinedCampaigns: (joinedRes?.campaigns || []) as CampaignCardData[],
    discoverCampaigns,
    suggestions: suggestionsRes?.suggestions || [],
    digest: digestRes?.digest || null,
    pageViews,
    artistId: resolvedArtistId,
    artistName: artist?.name || null,
    artistGenre: artist?.genre || null,
    artists: ctx.artists.map(a => ({ id: a.id, name: a.name })),
    fanStats: {
      subscribers: ctx.subscriberCount,
      qrClicks: ctx.qrClickCount,
      embedViews: ctx.embedViewCount,
      linkClicks: ctx.linkClickCount,
    },
  }
}
