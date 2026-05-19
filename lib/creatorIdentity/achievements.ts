import type { CreatorIdentityStats, PublicAchievementDef, PublicAchievementId } from './types'

export const PUBLIC_ACHIEVEMENT_DEFS: PublicAchievementDef[] = [
  { id: 'public_launch', labelKey: 'achievementPublicLaunch', icon: '🌐', badgeKey: 'achievementBadgeLive' },
  { id: 'first_release', labelKey: 'achievementFirstRelease', icon: '🎵', badgeKey: 'achievementBadgeReleased' },
  { id: 'first_fan', labelKey: 'achievementFirstFan', icon: '✉', badgeKey: 'achievementBadgeFan' },
  { id: 'hundred_clicks', labelKey: 'achievement100Clicks', icon: '📊', badgeKey: 'achievementBadge100' },
  { id: 'growth_starter', labelKey: 'achievementGrowthStarter', icon: '◎', badgeKey: 'achievementBadgeStarter' },
  { id: 'campaign_builder', labelKey: 'achievementCampaignBuilder', icon: '📣', badgeKey: 'achievementBadgeCampaign' },
  { id: 'epk_published', labelKey: 'achievementEpkPublished', icon: '📰', badgeKey: 'achievementBadgeEpk' },
]

function checkAchievement(id: PublicAchievementId, stats: CreatorIdentityStats): boolean {
  switch (id) {
    case 'public_launch':
      return stats.hasPublicPage
    case 'first_release':
      return stats.publicReleaseCount > 0
    case 'first_fan':
      return stats.subscriberCount > 0
    case 'hundred_clicks':
      return stats.clickCount >= 100
    case 'growth_starter':
      return stats.growthScorePercent >= 25
    case 'campaign_builder':
      return stats.hasCampaign
    case 'epk_published':
      return stats.hasEpk
    default:
      return false
  }
}

export function resolvePublicAchievements(
  stats: CreatorIdentityStats,
  tx: Record<string, string>
): import('./types').PublicAchievement[] {
  return PUBLIC_ACHIEVEMENT_DEFS.map(def => {
    const earned = checkAchievement(def.id, stats)
    return {
      ...def,
      earned,
      label: tx[def.labelKey] || def.labelKey,
      badge: earned && def.badgeKey ? tx[def.badgeKey] : undefined,
    }
  })
}
