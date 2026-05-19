import type { FeatureKey } from '@/lib/subscription'
import type { PlaybookContext } from './types'

export type GrowthMissionCategory =
  | 'setup'
  | 'releases'
  | 'promotion'
  | 'fan_growth'
  | 'analytics'
  | 'advanced'

export type GrowthMissionDifficulty = 'easy' | 'medium' | 'advanced'

export type GrowthMissionDef = {
  id: string
  checkId: string
  category: GrowthMissionCategory
  difficulty: GrowthMissionDifficulty
  /** Weight toward Growth Score (separate from Artist Progress). */
  progressValue: number
  /** Lower = higher priority for recommendations. */
  impact: number
  labelKey: string
  descKey?: string
  emptyStateKey?: string
  href?: (ctx: PlaybookContext) => string | null
  tags?: ('release' | 'growth')[]
  planFeature?: FeatureKey
}

function artistHref(ctx: PlaybookContext, hash = '') {
  const id = ctx.selectedArtistId || ctx.artists[0]?.id
  return id ? `/artist/${id}${hash}` : '/dashboard'
}

function songHref(ctx: PlaybookContext, hash = '') {
  const song = ctx.songs.find(s => s.artist_id === (ctx.selectedArtistId || ctx.artists[0]?.id)) || ctx.songs[0]
  return song ? `/song/${song.id}${hash}` : artistHref(ctx, '#songs')
}

export const GROWTH_MISSION_CATEGORY_ORDER: GrowthMissionCategory[] = [
  'setup',
  'releases',
  'promotion',
  'fan_growth',
  'analytics',
  'advanced',
]

export const GROWTH_MISSIONS: GrowthMissionDef[] = [
  // SETUP
  {
    id: 'gm_public_artist_page',
    category: 'setup',
    checkId: 'has_public_artist_page',
    difficulty: 'easy',
    progressValue: 12,
    impact: 5,
    labelKey: 'growthMissionPublicArtistPage',
    descKey: 'growthMissionPublicArtistPageDesc',
    href: ctx => artistHref(ctx, '#public'),
    tags: ['growth'],
  },
  {
    id: 'gm_public_song_page',
    category: 'setup',
    checkId: 'has_public_song_page',
    difficulty: 'easy',
    progressValue: 10,
    impact: 8,
    labelKey: 'growthMissionPublicSongPage',
    descKey: 'growthMissionPublicSongPageDesc',
    href: ctx => songHref(ctx),
    tags: ['growth'],
  },
  {
    id: 'gm_social_links',
    category: 'setup',
    checkId: 'has_social_links',
    difficulty: 'easy',
    progressValue: 8,
    impact: 12,
    labelKey: 'growthMissionSocialLinks',
    descKey: 'growthMissionSocialLinksDesc',
    href: ctx => artistHref(ctx, '#settings'),
    tags: ['growth'],
  },
  {
    id: 'gm_share_qr',
    category: 'setup',
    checkId: 'has_public_artist_page',
    difficulty: 'easy',
    progressValue: 8,
    impact: 14,
    labelKey: 'growthMissionShareQr',
    descKey: 'growthMissionShareQrDesc',
    emptyStateKey: 'growthEmptyNoQr',
    href: ctx => artistHref(ctx, '#public'),
    tags: ['growth'],
  },

  // RELEASES
  {
    id: 'gm_release_metadata',
    category: 'releases',
    checkId: 'has_song_metadata',
    difficulty: 'medium',
    progressValue: 10,
    impact: 18,
    labelKey: 'growthMissionReleaseMetadata',
    descKey: 'growthMissionReleaseMetadataDesc',
    href: ctx => songHref(ctx),
    tags: ['release'],
  },
  {
    id: 'gm_release_date',
    category: 'releases',
    checkId: 'has_release_date',
    difficulty: 'medium',
    progressValue: 8,
    impact: 20,
    labelKey: 'growthMissionReleaseDate',
    descKey: 'growthMissionReleaseDateDesc',
    emptyStateKey: 'growthEmptyNoReleaseCampaign',
    href: ctx => songHref(ctx, '#campaign'),
    tags: ['release'],
  },
  {
    id: 'gm_publish_epk',
    category: 'releases',
    checkId: 'has_epk_published',
    difficulty: 'medium',
    progressValue: 10,
    impact: 22,
    labelKey: 'growthMissionPublishEpk',
    descKey: 'growthMissionPublishEpkDesc',
    href: ctx => artistHref(ctx, '#epk'),
    tags: ['release'],
  },

  // PROMOTION
  {
    id: 'gm_tiktok_caption',
    category: 'promotion',
    checkId: 'has_tiktok_caption',
    difficulty: 'easy',
    progressValue: 8,
    impact: 16,
    labelKey: 'growthMissionTiktokCaption',
    descKey: 'growthMissionTiktokCaptionDesc',
    href: ctx => songHref(ctx, '#captions'),
    tags: ['release', 'growth'],
  },
  {
    id: 'gm_spotify_pitch',
    category: 'promotion',
    checkId: 'has_spotify_pitch',
    difficulty: 'medium',
    progressValue: 10,
    impact: 17,
    labelKey: 'growthMissionSpotifyPitch',
    descKey: 'growthMissionSpotifyPitchDesc',
    href: ctx => songHref(ctx, '#campaign'),
    tags: ['release'],
  },
  {
    id: 'gm_release_campaign',
    category: 'promotion',
    checkId: 'has_campaign',
    difficulty: 'medium',
    progressValue: 12,
    impact: 15,
    labelKey: 'growthMissionReleaseCampaign',
    descKey: 'growthMissionReleaseCampaignDesc',
    emptyStateKey: 'growthEmptyNoReleaseCampaign',
    href: ctx => songHref(ctx, '#campaign'),
    tags: ['release'],
  },
  {
    id: 'gm_share_campaign',
    category: 'promotion',
    checkId: 'has_campaign_link_ready',
    difficulty: 'medium',
    progressValue: 8,
    impact: 19,
    labelKey: 'growthMissionShareCampaign',
    descKey: 'growthMissionShareCampaignDesc',
    href: ctx => songHref(ctx, '#campaign'),
    tags: ['release', 'growth'],
  },

  // FAN GROWTH
  {
    id: 'gm_newsletter_signup',
    category: 'fan_growth',
    checkId: 'has_newsletter_ready',
    difficulty: 'easy',
    progressValue: 12,
    impact: 10,
    labelKey: 'growthMissionNewsletterSignup',
    descKey: 'growthMissionNewsletterSignupDesc',
    href: ctx => artistHref(ctx, '#fanhub'),
    tags: ['growth'],
  },
  {
    id: 'gm_first_subscriber',
    category: 'fan_growth',
    checkId: 'has_subscriber',
    difficulty: 'medium',
    progressValue: 14,
    impact: 24,
    labelKey: 'growthMissionFirstSubscriber',
    descKey: 'growthMissionFirstSubscriberDesc',
    emptyStateKey: 'growthEmptyNoSubscribers',
    href: ctx => artistHref(ctx, '#fanhub'),
    tags: ['growth'],
  },
  {
    id: 'gm_newsletter_draft',
    category: 'fan_growth',
    checkId: 'has_newsletter_draft',
    difficulty: 'easy',
    progressValue: 8,
    impact: 13,
    labelKey: 'growthMissionNewsletterDraft',
    descKey: 'growthMissionNewsletterDraftDesc',
    href: ctx => artistHref(ctx, '#fanhub'),
    tags: ['growth'],
  },

  // ANALYTICS
  {
    id: 'gm_qr_traffic',
    category: 'analytics',
    checkId: 'has_qr_click',
    difficulty: 'medium',
    progressValue: 10,
    impact: 26,
    labelKey: 'growthMissionQrTraffic',
    descKey: 'growthMissionQrTrafficDesc',
    emptyStateKey: 'growthEmptyNoQrScans',
    href: ctx => artistHref(ctx, '#public'),
    tags: ['growth'],
    planFeature: 'qr_analytics',
  },
  {
    id: 'gm_embed_widget',
    category: 'analytics',
    checkId: 'has_embed_setup',
    difficulty: 'medium',
    progressValue: 10,
    impact: 21,
    labelKey: 'growthMissionEmbedWidget',
    descKey: 'growthMissionEmbedWidgetDesc',
    emptyStateKey: 'growthEmptyNoEmbed',
    href: ctx => songHref(ctx, '#publish'),
    tags: ['growth'],
    planFeature: 'embed_widget',
  },
  {
    id: 'gm_embed_views',
    category: 'analytics',
    checkId: 'has_embed_view',
    difficulty: 'advanced',
    progressValue: 8,
    impact: 28,
    labelKey: 'growthMissionEmbedViews',
    descKey: 'growthMissionEmbedViewsDesc',
    emptyStateKey: 'growthEmptyNoEmbed',
    href: ctx => artistHref(ctx, '#analytics'),
    tags: ['growth'],
  },
  {
    id: 'gm_analytics_activity',
    category: 'analytics',
    checkId: 'has_analytics_activity',
    difficulty: 'advanced',
    progressValue: 8,
    impact: 30,
    labelKey: 'growthMissionAnalyticsActivity',
    descKey: 'growthMissionAnalyticsActivityDesc',
    href: ctx => artistHref(ctx, '#analytics'),
    tags: ['growth'],
    planFeature: 'advanced_analytics',
  },

  // ADVANCED
  {
    id: 'gm_100_clicks',
    category: 'advanced',
    checkId: 'has_100_clicks',
    difficulty: 'advanced',
    progressValue: 10,
    impact: 35,
    labelKey: 'growthMission100Clicks',
    descKey: 'growthMission100ClicksDesc',
    href: ctx => artistHref(ctx, '#analytics'),
    tags: ['growth'],
  },
  {
    id: 'gm_released_track',
    category: 'advanced',
    checkId: 'has_released_song',
    difficulty: 'advanced',
    progressValue: 12,
    impact: 32,
    labelKey: 'growthMissionFirstRelease',
    descKey: 'growthMissionFirstReleaseDesc',
    href: ctx => artistHref(ctx, '#songs'),
    tags: ['release'],
  },
]
