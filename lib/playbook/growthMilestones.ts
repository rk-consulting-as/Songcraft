import type { GrowthMilestoneDef } from './growthTypes'

export const GROWTH_MILESTONES: GrowthMilestoneDef[] = [
  { id: 'gm_milestone_first_public', checkId: 'has_public_artist_page', labelKey: 'growthMilestoneFirstPublic', icon: '🌐', badgeKey: 'growthBadgeFirstPublic' },
  { id: 'gm_milestone_first_release', checkId: 'has_released_song', labelKey: 'growthMilestoneFirstRelease', icon: '🎵', badgeKey: 'growthBadgeFirstRelease' },
  { id: 'gm_milestone_first_fan', checkId: 'has_subscriber', labelKey: 'growthMilestoneFirstFan', icon: '✉', badgeKey: 'growthBadgeFirstFan' },
  { id: 'gm_milestone_first_campaign', checkId: 'has_campaign', labelKey: 'growthMilestoneFirstCampaign', icon: '📣', badgeKey: 'growthBadgeFirstCampaign' },
  { id: 'gm_milestone_first_embed', checkId: 'has_embed_view', labelKey: 'growthMilestoneFirstEmbed', icon: '⧉', badgeKey: 'growthBadgeFirstEmbed' },
  { id: 'gm_milestone_first_newsletter', checkId: 'has_newsletter_draft', labelKey: 'growthMilestoneFirstNewsletter', icon: '📬', badgeKey: 'growthBadgeFirstNewsletter' },
  { id: 'gm_milestone_100_clicks', checkId: 'has_100_clicks', labelKey: 'growthMilestone100Clicks', icon: '📊', badgeKey: 'growthBadge100Clicks' },
  { id: 'gm_milestone_growth_starter', checkId: 'growth_starter_complete', labelKey: 'growthMilestoneGrowthStarter', icon: '◎', badgeKey: 'growthBadgeGrowthStarter' },
  { id: 'gm_milestone_release_ready', checkId: 'release_ready_complete', labelKey: 'growthMilestoneReleaseReady', icon: '◆', badgeKey: 'growthBadgeReleaseReady' },
]
