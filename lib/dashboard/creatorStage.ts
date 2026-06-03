export type CreatorStage = 'starter' | 'builder' | 'releasing' | 'growing' | 'established'

export type StageSignals = {
  artistCount: number
  songCount: number
  hasPublicPage: boolean
  hasActiveReleaseCampaign: boolean
  hasDistributionActivity: boolean
  hasPublishedSongs: boolean
  hasPlaylistCommunities: boolean
  publishedStoryCount: number
  hasNewsletter: boolean
  growthScore: number
  hasCommunityParticipation: boolean
  hasContentEcosystem: boolean
}

export function buildStageSignals(input: {
  artists: { page_enabled?: boolean; page_slug?: string | null }[]
  songs: { status: string; publish_content?: Record<string, unknown> | null }[]
  participation: {
    hostedActiveCampaignCount?: number
    joinedNeedingProofToday?: number
    approvedActivityProofCount?: number
    pendingReviews?: number
  } | null
  joinedCampaignCount: number
  publishedStoryCount: number
  subscriberCount: number
  hasNewsletterSetup?: boolean
  growthScore: number
}): StageSignals {
  const hasPublicPage = input.artists.some(a => !!(a.page_enabled && a.page_slug))
  const hasPublishedSongs = input.songs.some(s => s.status === 'released')
  const hasDistributionActivity = input.songs.some(s => {
    const dist = (s.publish_content?.distribution || {}) as { status?: string }
    return dist.status === 'submitted' || dist.status === 'live'
  })
  const hasActiveReleaseCampaign = input.songs.some(s => {
    const pc = s.publish_content || {}
    const timeline = Array.isArray(pc.campaign_timeline) ? pc.campaign_timeline : []
    return timeline.length > 0 || !!pc.distribution
  }) || (input.participation?.hostedActiveCampaignCount || 0) > 0

  const hasPlaylistCommunities =
    input.joinedCampaignCount > 0 ||
    (input.participation?.hostedActiveCampaignCount || 0) > 0 ||
    (input.participation?.approvedActivityProofCount || 0) > 0

  const hasNewsletter = input.subscriberCount > 0 || !!input.hasNewsletterSetup
  const hasCommunityParticipation =
    input.joinedCampaignCount > 0 ||
    (input.participation?.approvedActivityProofCount || 0) > 0 ||
    (input.participation?.pendingReviews || 0) > 0

  const hasContentEcosystem =
    hasPublicPage &&
    hasPublishedSongs &&
    input.publishedStoryCount > 0

  return {
    artistCount: input.artists.length,
    songCount: input.songs.length,
    hasPublicPage,
    hasActiveReleaseCampaign,
    hasDistributionActivity,
    hasPublishedSongs,
    hasPlaylistCommunities,
    publishedStoryCount: input.publishedStoryCount,
    hasNewsletter,
    growthScore: input.growthScore,
    hasCommunityParticipation,
    hasContentEcosystem,
  }
}

/** Highest fully satisfied maturity stage wins. */
export function detectCreatorStage(signals: StageSignals): CreatorStage {
  if (
    signals.growthScore > 80 &&
    signals.artistCount >= 2 &&
    signals.hasCommunityParticipation &&
    signals.hasContentEcosystem
  ) {
    return 'established'
  }
  if (
    signals.hasPlaylistCommunities &&
    signals.publishedStoryCount > 0 &&
    signals.hasNewsletter &&
    signals.growthScore > 60
  ) {
    return 'growing'
  }
  if (
    signals.hasActiveReleaseCampaign &&
    signals.hasDistributionActivity &&
    signals.hasPublishedSongs
  ) {
    return 'releasing'
  }
  if (signals.artistCount >= 1 && signals.songCount >= 5 && signals.hasPublicPage) {
    return 'builder'
  }
  return 'starter'
}

export type PersonalizedHero = {
  stage: CreatorStage
  headline: string
  subline: string
  nextStepLabel: string
  nextStepHref: string | null
  focusLine?: string
}

export function buildPersonalizedHero(
  stage: CreatorStage,
  tx: Record<string, string>,
  opts: {
    displayName?: string | null
    releaseTasksRemaining?: number
    opportunityCount?: number
    firstArtistId?: string
    onCreateArtist?: boolean
  },
): PersonalizedHero {
  const name = opts.displayName?.trim()?.split(' ')[0] || tx.cmdGreetingFallback
  const hour = new Date().getHours()
  const timeGreeting =
    hour < 12 ? tx.cmdGreetingMorning : hour < 18 ? tx.cmdGreetingAfternoon : tx.cmdGreetingEvening
  const namedGreeting = timeGreeting.replace('{name}', name)

  switch (stage) {
    case 'starter':
      return {
        stage,
        headline: tx.adaptHeroStarterHeadline,
        subline: tx.adaptHeroStarterSubline,
        nextStepLabel: tx.adaptHeroStarterNext,
        nextStepHref: opts.onCreateArtist ? null : opts.firstArtistId ? `/artist/${opts.firstArtistId}` : null,
      }
    case 'builder':
      return {
        stage,
        headline: namedGreeting,
        subline: tx.adaptHeroBuilderSubline,
        nextStepLabel: tx.adaptHeroBuilderNext,
        nextStepHref: opts.firstArtistId ? `/artist/${opts.firstArtistId}#brand-sharing` : null,
      }
    case 'releasing': {
      const n = opts.releaseTasksRemaining ?? 0
      return {
        stage,
        headline: tx.adaptHeroReleasingHeadline,
        subline: tx.adaptHeroReleasingSubline.replace('{n}', String(n)),
        nextStepLabel: tx.adaptHeroReleasingNext,
        nextStepHref: opts.firstArtistId ? `/artist/${opts.firstArtistId}#songs` : '/growth',
      }
    }
    case 'growing': {
      const n = opts.opportunityCount ?? 0
      return {
        stage,
        headline: tx.adaptHeroGrowingHeadline,
        subline: tx.adaptHeroGrowingSubline.replace('{n}', String(n)),
        nextStepLabel: tx.adaptHeroGrowingNext,
        nextStepHref: '/growth',
      }
    }
    case 'established':
      return {
        stage,
        headline: tx.adaptHeroEstablishedHeadline.replace('{name}', name),
        subline: tx.adaptHeroEstablishedSubline,
        nextStepLabel: tx.adaptHeroEstablishedNext,
        nextStepHref: '/discover/campaigns',
        focusLine: tx.adaptHeroEstablishedFocus,
      }
  }
}
