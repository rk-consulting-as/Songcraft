import { PLATFORM_PROFILES, normalizePlatformId } from './profiles'
import type {
  ContentType,
  CustomPlatformLimits,
  LimitState,
  LimitStateInfo,
  PlatformId,
  PlatformProfile,
  ResolvedContentLimit,
} from './types'

export function getPlatformProfile(
  platformId: PlatformId | string | null | undefined,
  customLimits?: CustomPlatformLimits | null,
): PlatformProfile {
  const id = normalizePlatformId(platformId)
  if (id === 'custom') {
    return {
      id: 'custom',
      labelKey: 'aiPlatformCustom',
      lyrics: {
        recommendedMin: customLimits?.lyricsRecommendedMin ?? 3000,
        recommendedMax: customLimits?.lyricsRecommendedMax ?? 4500,
        hardMax: customLimits?.lyricsHardMax ?? 5000,
        warnThreshold: customLimits?.lyricsRecommendedMax ?? 4000,
        dangerThreshold: customLimits?.lyricsHardMax
          ? Math.max((customLimits.lyricsHardMax || 5000) - 500, 1)
          : 4500,
        adaptTargetMin: customLimits?.lyricsRecommendedMax ?? 4000,
        adaptTargetMax: customLimits?.lyricsHardMax
          ? Math.min((customLimits.lyricsHardMax || 5000) - 500, customLimits.lyricsHardMax || 5000)
          : 4500,
      },
      stylePrompt: {
        recommendedMax: customLimits?.stylePromptRecommendedMax ?? 900,
        hardMax: customLimits?.stylePromptHardMax ?? 1000,
        adaptTargetMax: customLimits?.stylePromptRecommendedMax ?? 950,
      },
    }
  }
  return PLATFORM_PROFILES[id]
}

function pickContentSpec(profile: PlatformProfile, contentType: ContentType) {
  switch (contentType) {
    case 'lyrics': return profile.lyrics
    case 'stylePrompt': return profile.stylePrompt
    case 'spotifyPitch': return profile.spotifyPitch
    case 'caption': return profile.caption
    case 'story': return profile.story
    case 'epkBio': return profile.epkBio
    default: return profile.lyrics
  }
}

export function getContentLimit(
  platformId: PlatformId | string | null | undefined,
  contentType: ContentType,
  customLimits?: CustomPlatformLimits | null,
): ResolvedContentLimit {
  const profile = getPlatformProfile(platformId, customLimits)
  const spec = pickContentSpec(profile, contentType) || {}
  const hardMax = spec.hardMax ?? null
  const recommendedMax = spec.recommendedMax ?? null
  const recommendedMin = spec.recommendedMin ?? null
  const warnThreshold = spec.warnThreshold ?? recommendedMax
  const dangerThreshold = spec.dangerThreshold ?? (hardMax != null ? Math.max(hardMax - 500, 1) : null)

  return {
    recommendedMin,
    recommendedMax,
    hardMax,
    warnThreshold,
    dangerThreshold,
    adaptTargetMin: spec.adaptTargetMin ?? (recommendedMax != null ? Math.max(recommendedMax - 500, 0) : null),
    adaptTargetMax: spec.adaptTargetMax ?? recommendedMax,
  }
}

export function getLimitState(currentLength: number, limit: ResolvedContentLimit): LimitStateInfo {
  if (limit.hardMax == null) {
    return {
      state: 'unlimited',
      className: 'unlimited',
      labelKey: 'aiLimitStateUnlimited',
      helperKey: 'aiLimitNoPlatformLimit',
    }
  }

  let state: LimitState = 'ok'
  if (currentLength > limit.hardMax) {
    state = 'over_limit'
  } else if (limit.dangerThreshold != null && currentLength > limit.dangerThreshold) {
    state = 'near_limit'
  } else if (limit.warnThreshold != null && currentLength > limit.warnThreshold) {
    state = 'recommended_warning'
  } else if (limit.recommendedMax != null && currentLength > limit.recommendedMax) {
    state = 'recommended_warning'
  }

  const className = state === 'ok'
    ? 'ok'
    : state === 'recommended_warning'
      ? 'warning'
      : state === 'near_limit'
        ? 'danger'
        : 'error'

  const labelKey = {
    ok: 'aiLimitStateOk',
    recommended_warning: 'aiLimitStateWarning',
    near_limit: 'aiLimitStateNearLimit',
    over_limit: 'aiLimitStateOverLimit',
    unlimited: 'aiLimitStateUnlimited',
  }[state]

  const helperKey = {
    ok: undefined,
    recommended_warning: 'aiLimitRecommendedWarning',
    near_limit: 'aiLimitNearLimit',
    over_limit: 'aiLimitOverLimit',
    unlimited: 'aiLimitNoPlatformLimit',
  }[state]

  return { state, className, labelKey, helperKey }
}

export function formatContentCounter(currentLength: number, limit: ResolvedContentLimit): string {
  if (limit.hardMax == null) return String(currentLength)
  return `${currentLength} / ${limit.hardMax}`
}

export function isWithinHardLimit(currentLength: number, limit: ResolvedContentLimit): boolean {
  if (limit.hardMax == null) return true
  return currentLength <= limit.hardMax
}

export function shouldShowAdaptAction(currentLength: number, limit: ResolvedContentLimit): boolean {
  if (limit.hardMax == null) return false
  const threshold = limit.warnThreshold ?? limit.recommendedMax ?? limit.hardMax
  return currentLength > (threshold ?? limit.hardMax)
}

export function getTextCharCount(text: string | null | undefined): number {
  return (text || '').length
}

export function buildRecommendedRangeLabel(limit: ResolvedContentLimit): string | null {
  if (limit.recommendedMin == null && limit.recommendedMax == null) return null
  if (limit.recommendedMin != null && limit.recommendedMax != null) {
    return `${limit.recommendedMin}–${limit.recommendedMax}`
  }
  if (limit.recommendedMax != null) return `≤ ${limit.recommendedMax}`
  return null
}

export function buildLyricsGenerationConstraints(
  platformId: PlatformId | string | null | undefined,
  customLimits?: CustomPlatformLimits | null,
): string {
  const profile = getPlatformProfile(platformId, customLimits)
  const limit = getContentLimit(platformId, 'lyrics', customLimits)

  if (profile.id === 'generic') {
    return [
      'Prefer concise song structure: 2 verses, 2-3 choruses, 1 bridge.',
      'Avoid unnecessary repetition and long production notes inside the lyrics unless requested.',
      'No strict character maximum, but keep the lyrics focused and performable.',
    ].join(' ')
  }

  const targetRange = buildRecommendedRangeLabel(limit)
  const hardPart = limit.hardMax != null ? `Hard maximum: ${limit.hardMax} characters — never exceed this.` : ''

  return [
    `Length constraints for ${profile.id} compatibility:`,
    targetRange ? `- Target total length: ${targetRange} characters (including section labels and line breaks).` : '',
    hardPart,
    '- Prefer structure: 2 verses, 2-3 choruses, 1 bridge.',
    '- Avoid unnecessary repetition, extra verses, or repeated choruses beyond what the song needs.',
    '- Keep lines concise; prioritize story and hook over padding.',
    '- Do not include long production notes inside the lyrics unless requested.',
  ].filter(Boolean).join(' ')
}

export function buildLyricsRefineConstraints(
  platformId: PlatformId | string | null | undefined,
  customLimits?: CustomPlatformLimits | null,
): string {
  const limit = getContentLimit(platformId, 'lyrics', customLimits)
  if (limit.hardMax == null) {
    return 'Keep lyrics concise with clear structure. Avoid unnecessary repetition.'
  }
  const range = buildRecommendedRangeLabel(limit)
  return [
    range ? `Keep total length between ${range} characters` : 'Keep lyrics concise',
    `and never exceed ${limit.hardMax} characters.`,
    'Avoid unnecessary repetition.',
  ].join(' ')
}

export function buildLyricsGenerationSystem(
  lang: string,
  useSongStructure: boolean,
  platformId: PlatformId | string | null | undefined,
  customLimits?: CustomPlatformLimits | null,
): string {
  const structureNote = useSongStructure ? ' Follow the song structure profile provided.' : ''
  return [
    `You are a creative songwriter. Write song lyrics based on the user's instructions. Write in ${lang}.`,
    'Format with Verse 1, Verse 2, Chorus, Bridge etc.',
    structureNote,
    buildLyricsGenerationConstraints(platformId, customLimits),
    'Output only the lyrics, no explanations.',
  ].filter(Boolean).join(' ')
}

export function buildLyricsRefineSystem(
  platformId: PlatformId | string | null | undefined,
  customLimits?: CustomPlatformLimits | null,
): string {
  return [
    'You are a creative songwriter. Adjust the lyrics based on the feedback.',
    buildLyricsRefineConstraints(platformId, customLimits),
    'Output only the updated lyrics.',
  ].join(' ')
}

export function buildAdaptLyricsSystem(
  platformId: PlatformId | string | null | undefined,
  customLimits?: CustomPlatformLimits | null,
): string {
  const profile = getPlatformProfile(platformId, customLimits)
  const limit = getContentLimit(platformId, 'lyrics', customLimits)
  const target = buildRecommendedRangeLabel({
    ...limit,
    recommendedMin: limit.adaptTargetMin,
    recommendedMax: limit.adaptTargetMax,
  }) || buildRecommendedRangeLabel(limit)

  return [
    `You adapt song lyrics for ${profile.id} while preserving the story, strongest chorus hooks, emotional arc, and writing style.`,
    target ? `Target ${target} characters total (including section labels and line breaks).` : 'Keep the lyrics concise.',
    limit.hardMax != null ? `Hard maximum ${limit.hardMax} characters — never exceed this.` : '',
    'Remove repetition and trim stage directions if needed.',
    'Keep 2 verses, 2-3 choruses, and 1 bridge when possible.',
    'Output only the adapted lyrics.',
  ].filter(Boolean).join(' ')
}

export function buildStylePromptGenerationConstraints(
  platformId: PlatformId | string | null | undefined,
  mode: 'compact' | 'detailed',
  customLimits?: CustomPlatformLimits | null,
): { targetMin: number; targetMax: number; hardMax: number | null } {
  const limit = getContentLimit(platformId, 'stylePrompt', customLimits)
  if (mode === 'detailed') {
    return { targetMin: 2000, targetMax: 4000, hardMax: null }
  }
  return {
    targetMin: 500,
    targetMax: limit.recommendedMax ?? 950,
    hardMax: limit.hardMax,
  }
}

export function lyricsFitPlatform(
  text: string | null | undefined,
  platformId: PlatformId | string | null | undefined,
  customLimits?: CustomPlatformLimits | null,
): boolean {
  const limit = getContentLimit(platformId, 'lyrics', customLimits)
  return isWithinHardLimit(getTextCharCount(text), limit)
}

export function stylePromptFitPlatform(
  text: string | null | undefined,
  platformId: PlatformId | string | null | undefined,
  customLimits?: CustomPlatformLimits | null,
  mode: 'compact' | 'detailed' = 'compact',
): boolean {
  if (mode === 'detailed') return true
  const limit = getContentLimit(platformId, 'stylePrompt', customLimits)
  return isWithinHardLimit(getTextCharCount(text), limit)
}
