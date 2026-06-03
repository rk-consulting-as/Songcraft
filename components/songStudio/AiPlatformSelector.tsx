'use client'

import { PLATFORM_IDS, PLATFORM_PROFILES } from '@/lib/aiPlatformProfiles/profiles'
import type { CustomPlatformLimits, PlatformId } from '@/lib/aiPlatformProfiles/types'
import { t, useLang } from '@/lib/i18n'

type Props = {
  platformId: PlatformId
  customLimits: CustomPlatformLimits
  onPlatformChange: (platformId: PlatformId) => void
  onCustomLimitsChange: (limits: CustomPlatformLimits) => void
  disabled?: boolean
}

export default function AiPlatformSelector({
  platformId,
  customLimits,
  onPlatformChange,
  onCustomLimitsChange,
  disabled,
}: Props) {
  const tx = t[useLang()] as Record<string, string>

  return (
    <div className="ai-platform-selector">
      <div className="song-studio-settings__row">
        <label className="song-studio-settings__label" htmlFor="ai-platform-select">{tx.aiPlatformTarget}</label>
        <select
          id="ai-platform-select"
          value={platformId}
          onChange={e => onPlatformChange(e.target.value as PlatformId)}
          disabled={disabled}
          style={{ width: 'auto', minWidth: 180 }}
        >
          {PLATFORM_IDS.map(id => (
            <option key={id} value={id}>
              {id === 'custom' ? tx.aiPlatformCustom : tx[PLATFORM_PROFILES[id as keyof typeof PLATFORM_PROFILES]?.labelKey] || id}
            </option>
          ))}
        </select>
      </div>
      {platformId === 'custom' && (
        <div className="ai-platform-selector__custom">
          <p className="workspace-section-desc">{tx.aiPlatformCustomDesc}</p>
          <div className="ai-platform-selector__custom-grid">
            <label>
              <span>{tx.aiPlatformCustomLyricsMax}</span>
              <input
                type="number"
                min={500}
                max={50000}
                value={customLimits.lyricsHardMax ?? 5000}
                onChange={e => onCustomLimitsChange({
                  ...customLimits,
                  lyricsHardMax: Number(e.target.value) || 5000,
                })}
                disabled={disabled}
              />
            </label>
            <label>
              <span>{tx.aiPlatformCustomLyricsRecommended}</span>
              <input
                type="number"
                min={0}
                max={50000}
                value={customLimits.lyricsRecommendedMax ?? 4500}
                onChange={e => onCustomLimitsChange({
                  ...customLimits,
                  lyricsRecommendedMax: Number(e.target.value) || 4500,
                })}
                disabled={disabled}
              />
            </label>
            <label>
              <span>{tx.aiPlatformCustomPromptMax}</span>
              <input
                type="number"
                min={100}
                max={10000}
                value={customLimits.stylePromptHardMax ?? 1000}
                onChange={e => onCustomLimitsChange({
                  ...customLimits,
                  stylePromptHardMax: Number(e.target.value) || 1000,
                })}
                disabled={disabled}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
