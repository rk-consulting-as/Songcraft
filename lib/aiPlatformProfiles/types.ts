export type PlatformId = 'suno' | 'udio' | 'generic' | 'custom'

export type ContentType =
  | 'lyrics'
  | 'stylePrompt'
  | 'spotifyPitch'
  | 'caption'
  | 'story'
  | 'epkBio'

export type ContentLimitSpec = {
  recommendedMin?: number | null
  recommendedMax?: number | null
  hardMax?: number | null
  /** Character count above which UI shows a soft warning (defaults from recommendedMax). */
  warnThreshold?: number | null
  /** Character count above which UI shows danger styling (defaults from hardMax). */
  dangerThreshold?: number | null
  adaptTargetMin?: number | null
  adaptTargetMax?: number | null
}

export type CustomPlatformLimits = {
  lyricsHardMax?: number | null
  lyricsRecommendedMin?: number | null
  lyricsRecommendedMax?: number | null
  stylePromptHardMax?: number | null
  stylePromptRecommendedMax?: number | null
}

export type PlatformProfile = {
  id: PlatformId
  labelKey: string
  warningKey?: string
  lyrics: ContentLimitSpec
  stylePrompt: ContentLimitSpec
  spotifyPitch?: ContentLimitSpec
  caption?: ContentLimitSpec
  story?: ContentLimitSpec
  epkBio?: ContentLimitSpec
}

export type ResolvedContentLimit = {
  recommendedMin: number | null
  recommendedMax: number | null
  hardMax: number | null
  warnThreshold: number | null
  dangerThreshold: number | null
  adaptTargetMin: number | null
  adaptTargetMax: number | null
}

export type LimitState = 'ok' | 'recommended_warning' | 'near_limit' | 'over_limit' | 'unlimited'

export type LimitStateInfo = {
  state: LimitState
  className: string
  labelKey: string
  helperKey?: string
}

export type SongAiPlatformSettings = {
  ai_platform?: PlatformId | string | null
  ai_platform_custom?: CustomPlatformLimits | null
}
