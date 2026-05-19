export const MEDIA_ASSET_TYPES = [
  'cover',
  'logo',
  'artist_photo',
  'banner',
  'epk_image',
  'campaign_graphic',
  'qr_export',
  'promo_image',
  'social_graphic',
] as const

export type MediaAssetType = (typeof MEDIA_ASSET_TYPES)[number]

export type MediaAssetVisibility = 'private' | 'public'

export type MediaAssetUsage = {
  epk?: boolean
  public_page?: boolean
  campaign?: boolean
  embed?: boolean
  brand_kit?: boolean
  used_in_epk?: boolean
  used_in_campaign?: boolean
  used_in_public_page?: boolean
  used_as_cover?: boolean
  used_as_brand_kit?: boolean
}

export type MediaAsset = {
  id: string
  user_id: string
  artist_id: string | null
  song_id: string | null
  campaign_id: string | null
  type: MediaAssetType
  title: string
  description: string | null
  tags: string[]
  file_url: string
  thumbnail_url: string | null
  mime_type: string
  size_bytes: number
  visibility: MediaAssetVisibility
  is_featured: boolean
  usage: MediaAssetUsage
  created_at: string
  updated_at: string
}

export type BrandKit = {
  logo_asset_id?: string | null
  hero_asset_id?: string | null
  profile_asset_id?: string | null
  logo_url?: string | null
  hero_url?: string | null
  profile_url?: string | null
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  tagline?: string
}

export type MediaLibraryLimits = {
  maxAssets: number
  maxFileBytes: number
  brandKitEnabled: boolean
  campaignPacksEnabled: boolean
}
