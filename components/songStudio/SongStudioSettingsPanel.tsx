'use client'

import AIProviderPicker from '@/components/AIProviderPicker'
import AiPlatformSelector from '@/components/songStudio/AiPlatformSelector'
import SongPublicPageActions from '@/components/SongPublicPageActions'
import { AI_OUTPUT_LANGUAGES, normalizeAIOutputLang, type AIOutputLang } from '@/lib/aiOutputLanguage'
import type { CustomPlatformLimits, PlatformId } from '@/lib/aiPlatformProfiles/types'
import type { AIProvider } from '@/lib/aiProvider'
import { t, useLang } from '@/lib/i18n'

type Props = {
  songId: string
  artistPageEnabled?: boolean
  artistAdminHidden?: boolean
  songPublicHidden?: boolean
  status: string
  statusOptions: { value: string; label: string }[]
  onStatusChange: (status: string) => void
  aiProvider: AIProvider
  onAiProviderChange: (p: AIProvider) => void
  aiOutputLang: AIOutputLang
  onAiOutputLangChange: (lang: AIOutputLang) => void
  aiPlatformId: PlatformId
  aiPlatformCustomLimits: CustomPlatformLimits
  onAiPlatformChange: (platformId: PlatformId) => void
  onAiPlatformCustomLimitsChange: (limits: CustomPlatformLimits) => void
  aiLoading?: boolean
  imageGenerating?: boolean
}

export default function SongStudioSettingsPanel({
  songId,
  artistPageEnabled,
  artistAdminHidden,
  songPublicHidden,
  status,
  statusOptions,
  onStatusChange,
  aiProvider,
  onAiProviderChange,
  aiOutputLang,
  onAiOutputLangChange,
  aiPlatformId,
  aiPlatformCustomLimits,
  onAiPlatformChange,
  onAiPlatformCustomLimitsChange,
  aiLoading,
  imageGenerating,
}: Props) {
  const tx = t[useLang()] as Record<string, string>

  return (
    <div className="song-studio-settings workspace-section">
      <div className="card workspace-card workspace-glass">
        <h2 className="workspace-section-title">{tx.songStudioSettingsTitle}</h2>
        <p className="workspace-section-desc">{tx.songStudioSettingsDesc}</p>

        <div className="song-studio-settings__row">
          <label className="song-studio-settings__label">{tx.status}</label>
          <select value={status} onChange={e => onStatusChange(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="song-studio-settings__row">
          <span className="song-studio-settings__label">{tx.songStudioPublicVisibility}</span>
          <SongPublicPageActions
            songId={songId}
            artistPageEnabled={!!artistPageEnabled}
            artistAdminHidden={!!artistAdminHidden}
            songPublicHidden={!!songPublicHidden}
            layout="inline"
          />
        </div>
      </div>

      <div className="card workspace-card workspace-glass">
        <h3 className="workspace-card-title">{tx.songStudioAiSettings}</h3>
        <div className="song-studio-settings__row">
          <span className="song-studio-settings__label">{tx.aiProviderLabel}</span>
          <AIProviderPicker value={aiProvider} onChange={onAiProviderChange} disabled={aiLoading || imageGenerating} />
        </div>
        <div className="song-studio-settings__row">
          <label className="song-studio-settings__label">{tx.aiOutputLangHint}</label>
          <select
            value={aiOutputLang}
            onChange={e => onAiOutputLangChange(normalizeAIOutputLang(e.target.value))}
            disabled={aiLoading}
            style={{ width: 'auto', minWidth: 145 }}
          >
            {AI_OUTPUT_LANGUAGES.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <AiPlatformSelector
          platformId={aiPlatformId}
          customLimits={aiPlatformCustomLimits}
          onPlatformChange={onAiPlatformChange}
          onCustomLimitsChange={onAiPlatformCustomLimitsChange}
          disabled={aiLoading}
        />
      </div>
    </div>
  )
}
