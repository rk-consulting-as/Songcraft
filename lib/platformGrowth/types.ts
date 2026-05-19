/** Platform spotlight — admin-curated via admin_platform_settings.discover_spotlight */
export type DiscoverSpotlightConfig = {
  artist_ids?: string[]
  song_ids?: string[]
}

export type ViaToneBrandingVariant = 'badge' | 'footer' | 'minimal' | 'embed'

export type CreatorCtaVariant = 'card' | 'footer' | 'inline' | 'hero'

export type PublicSurfaceStats = {
  publicReleaseCount: number
  publicSongCount: number
  publicCampaignCount: number
}
