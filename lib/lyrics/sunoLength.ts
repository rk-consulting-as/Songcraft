/**
 * @deprecated Import from `@/lib/aiPlatformProfiles/limits` instead.
 */
export const SUNO_LYRICS_MAX = 5000
export const SUNO_LYRICS_TARGET_MIN = 3000
export const SUNO_LYRICS_TARGET_MAX = 4500
export const SUNO_LYRICS_SHORTEN_TARGET_MIN = 4000
export const SUNO_LYRICS_SHORTEN_TARGET_MAX = 4500
export const SUNO_LYRICS_WARN = 4000
export const SUNO_LYRICS_DANGER = 4500

export {
  getTextCharCount as getLyricsCharCount,
  buildLyricsGenerationSystem,
  buildLyricsRefineSystem,
  buildAdaptLyricsSystem,
  lyricsFitPlatform as isLyricsWithinSunoLimit,
  formatContentCounter as formatLyricsCounter,
} from '@/lib/aiPlatformProfiles/limits'

import { getContentLimit, getLimitState } from '@/lib/aiPlatformProfiles/limits'

export type LyricsLengthState = 'success' | 'warning' | 'danger' | 'error'

const STATE_MAP: Record<string, LyricsLengthState> = {
  ok: 'success',
  recommended_warning: 'warning',
  near_limit: 'danger',
  over_limit: 'error',
  unlimited: 'success',
}

export function getLyricsLengthState(count: number): LyricsLengthState {
  const limit = getContentLimit('suno', 'lyrics')
  const info = getLimitState(count, limit)
  return STATE_MAP[info.state] || 'success'
}

/** @deprecated Use buildAdaptLyricsSystem(platformId) */
export const SUNO_LYRICS_SHORTEN_SYSTEM = ''
/** @deprecated */
export const SUNO_LYRICS_GENERATION_CONSTRAINTS = ''
/** @deprecated */
export const SUNO_LYRICS_REFINE_CONSTRAINTS = ''
