import { t, type Lang } from '@/lib/i18n'
import type { PlanId } from '@/lib/subscription'
import { FREE_LIMITS } from '@/lib/subscription'
import { runPlaybookCheck } from './checks'
import { GROWTH_MILESTONES } from './growthMilestones'
import {
  GROWTH_MISSIONS,
  GROWTH_MISSION_CATEGORY_ORDER,
  type GrowthMissionCategory,
} from './growthMissions'
import type {
  GrowthEngineSnapshot,
  GrowthEmptyState,
  GrowthMissionCategoryResult,
  GrowthMissionResult,
  GrowthRecommendation,
  GrowthTier,
  GrowthUpgradePrompt,
} from './growthTypes'
import type { PlaybookContext } from './types'

const CATEGORY_LABEL_KEYS: Record<GrowthMissionCategory, string> = {
  setup: 'growthCategorySetup',
  releases: 'growthCategoryReleases',
  promotion: 'growthCategoryPromotion',
  fan_growth: 'growthCategoryFanGrowth',
  analytics: 'growthCategoryAnalytics',
  advanced: 'growthCategoryAdvanced',
}

const TIER_KEYS: Record<GrowthTier, string> = {
  beginner: 'growthTierBeginner',
  intermediate: 'growthTierIntermediate',
  advanced: 'growthTierAdvanced',
}

function growthTier(percent: number): GrowthTier {
  if (percent >= 75) return 'advanced'
  if (percent >= 40) return 'intermediate'
  return 'beginner'
}

function creatorLevel(percent: number, tx: Record<string, string>): string {
  if (percent >= 85) return tx.growthCreatorLevelPro || 'Creator Pro'
  if (percent >= 55) return tx.growthCreatorLevelBuilder || 'Builder'
  if (percent >= 25) return tx.growthCreatorLevelStarter || 'Growth Starter'
  return tx.growthCreatorLevelNew || 'Getting started'
}

function isFeatureEnabled(planId: PlanId, featureKey?: string): boolean {
  if (!featureKey) return true
  if (planId === 'pro') return true
  const limits = FREE_LIMITS[featureKey as keyof typeof FREE_LIMITS]
  return limits?.enabled ?? true
}

function missionToResult(
  def: (typeof GROWTH_MISSIONS)[0],
  ctx: PlaybookContext,
  planId: PlanId,
  tx: Record<string, string>
): GrowthMissionResult {
  const done = runPlaybookCheck(def.checkId, ctx)
  const locked = !!def.planFeature && !isFeatureEnabled(planId, def.planFeature)
  return {
    ...def,
    done,
    locked,
    href: def.href?.(ctx) ?? null,
    label: tx[def.labelKey] || def.labelKey,
    description: def.descKey ? tx[def.descKey] : undefined,
  }
}

function buildRecommendation(
  mission: GrowthMissionResult,
  ctx: PlaybookContext,
  tx: Record<string, string>
): GrowthRecommendation {
  const artist = ctx.artists.find(a => a.id === ctx.selectedArtistId) || ctx.artists[0]
  const pageLive = runPlaybookCheck('has_public_artist_page', ctx)

  let description = mission.description || ''
  if (mission.id === 'gm_newsletter_signup' && pageLive) {
    description = tx.growthRecNewsletterLive || description
  } else if (mission.id === 'gm_first_subscriber' && runPlaybookCheck('has_newsletter_ready', ctx)) {
    description = tx.growthRecFirstSubscriber || description
  } else if (mission.id === 'gm_share_qr' && pageLive && !runPlaybookCheck('has_qr_click', ctx)) {
    description = tx.growthRecShareQr || description
  } else if (mission.id === 'gm_release_campaign' && !runPlaybookCheck('has_campaign', ctx)) {
    description = tx.growthRecFirstCampaign || description
  }

  return {
    title: mission.label,
    description,
    href: mission.href,
    missionId: mission.id,
  }
}

function collectEmptyStates(
  missions: GrowthMissionResult[],
  ctx: PlaybookContext,
  tx: Record<string, string>
): GrowthEmptyState[] {
  const states: GrowthEmptyState[] = []
  const seen = new Set<string>()

  const rules: { when: () => boolean; key: string; href: (ctx: PlaybookContext) => string | null }[] = [
    {
      when: () => runPlaybookCheck('has_public_artist_page', ctx) && !runPlaybookCheck('has_subscriber', ctx),
      key: 'growthEmptyNoSubscribers',
      href: c => `/artist/${c.selectedArtistId || c.artists[0]?.id}#fanhub`,
    },
    {
      when: () => runPlaybookCheck('has_public_artist_page', ctx) && !runPlaybookCheck('has_qr_click', ctx),
      key: 'growthEmptyNoQrScans',
      href: c => `/artist/${c.selectedArtistId || c.artists[0]?.id}#public`,
    },
    {
      when: () => ctx.songs.length > 0 && !runPlaybookCheck('has_campaign', ctx),
      key: 'growthEmptyNoReleaseCampaign',
      href: c => {
        const song = c.songs[0]
        return song ? `/song/${song.id}#campaign` : null
      },
    },
    {
      when: () => runPlaybookCheck('has_embed_setup', ctx) && !runPlaybookCheck('has_embed_view', ctx),
      key: 'growthEmptyNoEmbed',
      href: c => `/artist/${c.selectedArtistId || c.artists[0]?.id}#analytics`,
    },
  ]

  for (const rule of rules) {
    if (rule.when() && !seen.has(rule.key)) {
      seen.add(rule.key)
      states.push({
        id: rule.key,
        message: tx[rule.key] || rule.key,
        href: rule.href(ctx),
      })
    }
  }

  for (const m of missions) {
    if (!m.emptyStateKey || m.done || seen.has(m.emptyStateKey)) continue
    if (m.id === 'gm_share_qr' && !runPlaybookCheck('has_public_artist_page', ctx)) continue
    seen.add(m.emptyStateKey)
    states.push({
      id: m.emptyStateKey,
      message: tx[m.emptyStateKey] || m.emptyStateKey,
      href: m.href,
    })
  }

  return states.slice(0, 4)
}

function buildUpgradePrompt(
  planId: PlanId,
  missions: GrowthMissionResult[],
  tx: Record<string, string>
): GrowthUpgradePrompt | null {
  if (planId === 'pro') return null

  const locked = missions.filter(m => !m.done && m.locked && m.planFeature)
  if (locked.length === 0) {
    const growthHeavy = missions.filter(m => !m.done && m.tags?.includes('growth')).length >= 4
    if (growthHeavy) {
      return {
        title: tx.growthUpgradeFreeTitle || '',
        description: tx.growthUpgradeFreeDesc || '',
        href: '/settings?tab=billing',
        ctaKey: 'growthUpgradeCta',
      }
    }
    return null
  }

  const feature = locked[0].planFeature
  if (feature === 'embed_widget') {
    return {
      title: tx.growthUpgradeEmbedTitle || '',
      description: tx.growthUpgradeEmbedDesc || '',
      href: '/settings?tab=billing',
      ctaKey: 'growthUpgradeCta',
    }
  }
  if (feature === 'advanced_analytics' || feature === 'qr_analytics') {
    return {
      title: tx.growthUpgradeAnalyticsTitle || '',
      description: tx.growthUpgradeAnalyticsDesc || '',
      href: '/settings?tab=billing',
      ctaKey: 'growthUpgradeCta',
    }
  }

  return {
    title: tx.growthUpgradeFreeTitle || '',
    description: tx.growthUpgradeFreeDesc || '',
    href: '/settings?tab=billing',
    ctaKey: 'growthUpgradeCta',
  }
}

export function computeGrowthEngine(
  ctx: PlaybookContext,
  lang: Lang,
  planId: PlanId = 'free'
): GrowthEngineSnapshot {
  const tx = t[lang] as Record<string, string>

  const missions: GrowthMissionResult[] = GROWTH_MISSIONS.map(def =>
    missionToResult(def, ctx, planId, tx)
  )

  const categories: GrowthMissionCategoryResult[] = GROWTH_MISSION_CATEGORY_ORDER.map(id => {
    const catMissions = missions.filter(m => m.category === id)
    const total = catMissions.reduce((s, m) => s + m.progressValue, 0)
    const done = catMissions.filter(m => m.done).reduce((s, m) => s + m.progressValue, 0)
    const doneCount = catMissions.filter(m => m.done).length
    return {
      id,
      label: tx[CATEGORY_LABEL_KEYS[id]] || id,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      doneCount,
      totalCount: catMissions.length,
      missions: catMissions,
    }
  })

  const totalWeight = missions.reduce((s, m) => s + m.progressValue, 0)
  const doneWeight = missions.filter(m => m.done).reduce((s, m) => s + m.progressValue, 0)
  const growthScorePercent = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0
  const tier = growthTier(growthScorePercent)

  const incomplete = missions
    .filter(m => !m.done && !m.locked)
    .sort((a, b) => a.impact - b.impact)

  const nextMission = incomplete[0] ?? null
  const releaseMission = incomplete.find(m => m.tags?.includes('release')) ?? null
  const growthMission = incomplete.find(m => m.tags?.includes('growth')) ?? null

  const milestones = GROWTH_MILESTONES.map(def => ({
    ...def,
    done: runPlaybookCheck(def.checkId, ctx),
    label: tx[def.labelKey] || def.labelKey,
    badge: def.badgeKey ? tx[def.badgeKey] : undefined,
  }))

  const emptyStates = collectEmptyStates(missions, ctx, tx)
  const upgradePrompt = buildUpgradePrompt(planId, missions, tx)

  return {
    growthScorePercent,
    growthTier: tier,
    tierLabel: tx[TIER_KEYS[tier]] || tier,
    creatorLevel: creatorLevel(growthScorePercent, tx),
    missions,
    categories,
    milestones,
    nextRecommendation: nextMission ? buildRecommendation(nextMission, ctx, tx) : null,
    releaseRecommendation: releaseMission ? buildRecommendation(releaseMission, ctx, tx) : null,
    growthRecommendation: growthMission ? buildRecommendation(growthMission, ctx, tx) : null,
    emptyStates,
    upgradePrompt,
    completedMissionCount: missions.filter(m => m.done).length,
    totalMissionCount: missions.length,
  }
}
