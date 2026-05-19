export type EpkSongCoverAsset = {
  asset_id?: string
  url?: string
}

export type EpkSettings = {
  short_bio?: string
  long_bio?: string
  release_highlight?: string
  tagline?: string
  contact_info?: string
  social_links?: Record<string, string>
  selected_song_ids?: string[]
  public_enabled?: boolean
  /** Primary EPK hero — denormalized URL from library pick */
  image_url?: string
  epk_image_asset_id?: string
  cover_image_url?: string
  press_image_url?: string
  song_cover_assets?: Record<string, EpkSongCoverAsset>
}

export function getEpkSettings(pageSettings: Record<string, unknown> | null | undefined): EpkSettings {
  const raw = (pageSettings as { epk?: EpkSettings })?.epk
  return raw && typeof raw === 'object' ? raw : {}
}

export type CampaignMediaSlot = {
  asset_id?: string
  url?: string
}

export type CampaignMediaSettings = {
  graphic?: CampaignMediaSlot
  cover?: CampaignMediaSlot
  promo?: CampaignMediaSlot
}

export function getCampaignMedia(publishContent: Record<string, unknown> | null | undefined): CampaignMediaSettings {
  const raw = (publishContent as { campaign_media?: CampaignMediaSettings })?.campaign_media
  return raw && typeof raw === 'object' ? raw : {}
}
