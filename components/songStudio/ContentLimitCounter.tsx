'use client'

import {
  buildRecommendedRangeLabel,
  formatContentCounter,
  getContentLimit,
  getLimitState,
  getPlatformProfile,
  getTextCharCount,
} from '@/lib/aiPlatformProfiles/limits'
import type { CustomPlatformLimits, PlatformId } from '@/lib/aiPlatformProfiles/types'
import { t, useLang } from '@/lib/i18n'

type Props = {
  text: string
  contentType: 'lyrics' | 'stylePrompt'
  platformId: PlatformId | string
  customLimits?: CustomPlatformLimits | null
  showTarget?: boolean
}

export default function ContentLimitCounter({
  text,
  contentType,
  platformId,
  customLimits,
  showTarget = true,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const count = getTextCharCount(text)
  const limit = getContentLimit(platformId, contentType, customLimits)
  const stateInfo = getLimitState(count, limit)
  const profile = getPlatformProfile(platformId, customLimits)
  const recommended = buildRecommendedRangeLabel(limit)

  return (
    <div className="song-studio-lyrics-counter" aria-live="polite">
      {showTarget && (
        <p className="song-studio-lyrics-counter__target">
          {tx.aiLimitTarget}: {tx[profile.labelKey] || profile.labelKey}
        </p>
      )}
      <div className="song-studio-lyrics-counter__row">
        <span className="song-studio-lyrics-counter__label">{tx.aiLimitCurrent}</span>
        <span
          className={`song-studio-lyrics-counter__value song-studio-lyrics-counter__value--${stateInfo.className}`}
          aria-label={limit.hardMax != null ? `${count} of ${limit.hardMax} characters` : `${count} characters`}
        >
          {formatContentCounter(count, limit)} {tx.aiLimitCharacters}
        </span>
      </div>
      {limit.hardMax == null ? (
        <p className="song-studio-lyrics-counter__hint">{tx.aiLimitNoPlatformLimit}</p>
      ) : recommended ? (
        <p className="song-studio-lyrics-counter__hint">
          {tx.aiLimitRecommended}: {recommended}
        </p>
      ) : null}
      {stateInfo.helperKey && stateInfo.state !== 'ok' && stateInfo.state !== 'unlimited' && (
        <p className={`song-studio-lyrics-counter__state song-studio-lyrics-counter__state--${stateInfo.className}`}>
          {tx[stateInfo.helperKey]}
        </p>
      )}
      {profile.warningKey && platformId === 'suno' && (
        <p className="song-studio-lyrics-counter__hint">{tx[profile.warningKey]}</p>
      )}
    </div>
  )
}
