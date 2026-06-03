import type { CommandAction } from './types'

export type TodayImpactTier = 'critical' | 'high' | 'recommended'

export type TodayAction = CommandAction & {
  impactScore: number
  tier: TodayImpactTier
  tierLabel: string
}

function tierFromScore(score: number, tx: Record<string, string>): { tier: TodayImpactTier; tierLabel: string } {
  if (score >= 90) return { tier: 'critical', tierLabel: tx.adaptTodayCritical }
  if (score >= 70) return { tier: 'high', tierLabel: tx.adaptTodayHighImpact }
  return { tier: 'recommended', tierLabel: tx.adaptTodayRecommended }
}

function impactScoreForAction(action: CommandAction): number {
  const kindBoost: Record<CommandAction['kind'], number> = {
    playlist: 0,
    community: 0,
    release: 0,
    story: 0,
    playbook: 0,
    growth: 0,
  }
  switch (action.kind) {
    case 'playlist':
      kindBoost.playlist = 12
      break
    case 'community':
      kindBoost.community = 10
      break
    case 'release':
      kindBoost.release = 8
      break
    case 'story':
      kindBoost.story = 6
      break
    case 'playbook':
      kindBoost.playbook = 4
      break
    case 'growth':
      kindBoost.growth = 3
      break
  }
  return action.priority + (kindBoost[action.kind] || 0)
}

export function buildTodayActions(
  actions: CommandAction[],
  tx: Record<string, string>,
  max = 5,
): TodayAction[] {
  return actions
    .map(a => {
      const impactScore = impactScoreForAction(a)
      const { tier, tierLabel } = tierFromScore(impactScore, tx)
      return { ...a, impactScore, tier, tierLabel }
    })
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, max)
}
