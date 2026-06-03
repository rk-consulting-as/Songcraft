import type { PlatformId, PlatformProfile } from './types'

export const PLATFORM_IDS: PlatformId[] = ['suno', 'udio', 'generic', 'custom']

export const PLATFORM_PROFILES: Record<Exclude<PlatformId, 'custom'>, PlatformProfile> = {
  suno: {
    id: 'suno',
    labelKey: 'aiPlatformSuno',
    warningKey: 'aiPlatformSunoWarning',
    lyrics: {
      recommendedMin: 3000,
      recommendedMax: 4500,
      hardMax: 5000,
      warnThreshold: 4000,
      dangerThreshold: 4500,
      adaptTargetMin: 4000,
      adaptTargetMax: 4500,
    },
    stylePrompt: {
      recommendedMax: 900,
      hardMax: 1000,
      adaptTargetMax: 950,
    },
    spotifyPitch: { recommendedMax: 500, hardMax: 600 },
    caption: { recommendedMax: 2200, hardMax: 2500 },
    story: { recommendedMax: 12000, hardMax: 15000 },
    epkBio: { recommendedMax: 2500, hardMax: 3000 },
  },
  udio: {
    id: 'udio',
    labelKey: 'aiPlatformUdio',
    warningKey: 'aiPlatformUdioWarning',
    lyrics: {
      recommendedMin: 3000,
      recommendedMax: 8000,
      hardMax: 10000,
      warnThreshold: 8000,
      dangerThreshold: 9500,
      adaptTargetMin: 7500,
      adaptTargetMax: 9000,
    },
    stylePrompt: {
      recommendedMax: 1500,
      hardMax: 2000,
      adaptTargetMax: 1500,
    },
    spotifyPitch: { recommendedMax: 500, hardMax: 600 },
    caption: { recommendedMax: 2200, hardMax: 2500 },
    story: { recommendedMax: 12000, hardMax: 15000 },
    epkBio: { recommendedMax: 2500, hardMax: 3000 },
  },
  generic: {
    id: 'generic',
    labelKey: 'aiPlatformGeneric',
    lyrics: {
      recommendedMin: 0,
      recommendedMax: null,
      hardMax: null,
    },
    stylePrompt: {
      recommendedMax: null,
      hardMax: null,
    },
    spotifyPitch: { recommendedMax: null, hardMax: null },
    caption: { recommendedMax: null, hardMax: null },
    story: { recommendedMax: null, hardMax: null },
    epkBio: { recommendedMax: null, hardMax: null },
  },
}

export function normalizePlatformId(value: unknown): PlatformId {
  if (value === 'udio' || value === 'generic' || value === 'custom') return value
  return 'suno'
}
