import { computeArtistHealth } from './artistHealthScore'
import {
  buildPersonalizedHero,
  buildStageSignals,
  detectCreatorStage,
} from './creatorStage'
import { buildDiscoverOpportunities, type PublicCampaignRow } from './discoverOpportunities'
import { buildGrowthRecommendations } from './growthRecommendations'
import { buildQuickWins } from './quickWins'
import { buildSmartInsights } from './smartInsights'
import { buildTodayActions } from './todayActions'
import type { BuildCommandCenterInput, CommandCenterSnapshot, CommandAction } from './types'
import type { ParticipationStreaks } from '@/lib/passiveParticipation/types'

export type AdaptiveEnrichmentInput = BuildCommandCenterInput & {
  allActions: CommandAction[]
  displayName?: string | null
  publishedStoryCount: number
  joinedCampaignCount: number
  subscriberCount: number
  storyCountByArtist: Record<string, number>
  publicCampaigns: PublicCampaignRow[]
  ownCampaignIds: string[]
  streaks: ParticipationStreaks | null
  proofStreakDays?: number
}

import type { CommunityMomentum } from './types'

export function enrichCommandCenterSnapshot(
  base: CommandCenterSnapshot,
  input: AdaptiveEnrichmentInput,
): CommandCenterSnapshot {
  const growthScore = base.growthScore
  const signals = buildStageSignals({
    artists: input.artists,
    songs: input.songs,
    participation: input.participation,
    joinedCampaignCount: input.joinedCampaignCount,
    publishedStoryCount: input.publishedStoryCount,
    subscriberCount: input.subscriberCount,
    hasNewsletterSetup: input.artists.some(
      a => !!(a.page_settings as { fan_hub?: { newsletter_draft?: string } })?.fan_hub?.newsletter_draft,
    ),
    growthScore,
  })
  const stage = detectCreatorStage(signals)
  const firstArtistId = input.artists[0]?.id
  const releaseTasksRemaining = input.releaseTasks.filter(t => t.status !== 'done').length

  const growthOpportunities = buildGrowthRecommendations({
    artists: input.artists,
    songs: input.songs,
    publishedStoryCount: input.publishedStoryCount,
    joinedCampaignCount: input.joinedCampaignCount,
    playbook: input.playbook,
    stage,
    tx: input.tx,
  })

  const hero = buildPersonalizedHero(stage, input.tx, {
    displayName: input.displayName,
    releaseTasksRemaining,
    opportunityCount: growthOpportunities.length,
    firstArtistId,
    onCreateArtist: input.artists.length === 0,
  })

  const todayActions = buildTodayActions(input.allActions, input.tx, 5)
  const quickWins = buildQuickWins(input.artists, input.songs, input.publishedStoryCount, input.tx)

  const campaignArtistIds = new Set(input.campaignTitles.map(c => c.artist_id).filter(Boolean) as string[])
  const artists = base.artists.map(a => {
    const health = computeArtistHealth(
      {
        id: a.id,
        page_enabled: a.page_enabled,
        page_slug: input.artists.find(x => x.id === a.id)?.page_slug,
        page_settings: input.artists.find(x => x.id === a.id)?.page_settings,
      },
      input.songs,
      input.storyCountByArtist[a.id] || 0,
      campaignArtistIds.has(a.id),
      input.tx,
    )
    return {
      ...a,
      healthScore: health.score,
      healthLabel: health.label,
      healthLabelText: health.labelText,
    }
  })

  const smartInsights = buildSmartInsights({
    artists: input.artists.map(a => ({ id: a.id, name: a.name })),
    songs: input.songs.map(s => ({
      id: s.id,
      title: s.title,
      artist_id: s.artist_id,
      internal_play_count: s.internal_play_count,
    })),
    campaigns: input.campaignTitles.map(c => ({
      id: c.id,
      title: c.title,
      memberCount: 0,
    })),
    newestSubscriber: base.insights.newestSubscriber,
    newestStory: base.insights.newestStory,
    tx: input.tx,
  })

  const userGenres = input.artists.flatMap(a => (a.genre || '').split(',').map(g => g.trim())).filter(Boolean)
  const discoverOpportunities = buildDiscoverOpportunities(
    userGenres,
    input.publicCampaigns,
    new Set(input.ownCampaignIds),
    input.tx,
  )

  const streaks = input.streaks
  const communityMomentum: CommunityMomentum = {
    dailyStreak: streaks?.dailyCurrent ?? 0,
    weeklyStreak: streaks?.weeklyCurrent ?? 0,
    proofStreak: input.proofStreakDays ?? input.participation?.weekApprovedCount ?? 0,
    participationStreak: streaks?.dailyCurrent ?? 0,
  }

  return {
    ...base,
    stage,
    hero,
    todayActions,
    quickWins,
    growthOpportunities,
    artists,
    smartInsights,
    discoverOpportunities,
    communityMomentum,
    actions: todayActions,
    actionCount: input.allActions.length,
  }
}
