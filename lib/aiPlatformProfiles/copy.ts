import { getPlatformProfile } from './limits'
import type { ContentType, CustomPlatformLimits, PlatformId } from './types'

export function buildCopyLimitWarningKey(
  contentType: ContentType,
): 'aiCopyLimitLyrics' | 'aiCopyLimitStylePrompt' {
  return contentType === 'stylePrompt' ? 'aiCopyLimitStylePrompt' : 'aiCopyLimitLyrics'
}

export function buildAdaptActionKey(platformId: PlatformId | string | null | undefined): string {
  const profile = getPlatformProfile(platformId)
  if (profile.id === 'custom') return 'aiAdaptForCustom'
  if (profile.id === 'udio') return 'aiAdaptForUdio'
  if (profile.id === 'generic') return 'aiAdaptForGeneric'
  return 'aiAdaptForSuno'
}

export function buildReadinessLyricsLabelKey(
  platformId: PlatformId | string | null | undefined,
  fits: boolean,
): string {
  const profile = getPlatformProfile(platformId)
  if (profile.id === 'generic') return fits ? 'reviewCheckLyricsFitGeneric' : 'reviewCheckLyricsOverGeneric'
  if (profile.id === 'custom') return fits ? 'reviewCheckLyricsFitCustom' : 'reviewCheckLyricsOverCustom'
  if (profile.id === 'udio') return fits ? 'reviewCheckLyricsFitUdio' : 'reviewCheckLyricsOverUdio'
  return fits ? 'reviewCheckLyricsFitSuno' : 'reviewCheckLyricsOverSuno'
}

export function buildReadinessPromptLabelKey(
  platformId: PlatformId | string | null | undefined,
  fits: boolean,
): string {
  const profile = getPlatformProfile(platformId)
  if (profile.id === 'generic') return fits ? 'reviewCheckPromptFitGeneric' : 'reviewCheckPromptOverGeneric'
  if (profile.id === 'custom') return fits ? 'reviewCheckPromptFitCustom' : 'reviewCheckPromptOverCustom'
  if (profile.id === 'udio') return fits ? 'reviewCheckPromptFitUdio' : 'reviewCheckPromptOverUdio'
  return fits ? 'reviewCheckPromptFitSuno' : 'reviewCheckPromptOverSuno'
}

export function resolveSongAiPlatformSettings(
  publishContent: Record<string, unknown> | null | undefined,
  artistPageSettings?: Record<string, unknown> | null,
): { platformId: PlatformId; customLimits: CustomPlatformLimits } {
  const customLimits = (publishContent?.ai_platform_custom || {}) as CustomPlatformLimits
  const platformId = (publishContent?.ai_platform
    || artistPageSettings?.default_ai_platform
    || 'suno') as PlatformId
  return { platformId, customLimits }
}
