'use client'

import { useMemo, useState } from 'react'
import UpgradePrompt from '@/components/UpgradePrompt'
import {
  buildStoryAssistantPrompt,
  parseGeneratedStoryJson,
  type SongStorySource,
} from '@/lib/artistStories/generateFromSong'
import { STORY_TYPES, type GeneratedStoryDraft, type StoryType } from '@/lib/artistStories/types'
import type { AIOutputLang } from '@/lib/aiOutputLanguage'
import { t, useLang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import type { PlanId } from '@/lib/subscription'

const STORY_TYPE_LABEL_KEYS: Record<StoryType, string> = {
  behind_the_song: 'storyTypeBehindTheSong',
  release_story: 'storyTypeReleaseStory',
  artist_journal: 'storyTypeArtistJournal',
  lyrics_meaning: 'storyTypeLyricsMeaning',
  campaign_update: 'storyTypeCampaignUpdate',
  playlist_feature: 'storyTypePlaylistFeature',
  news: 'storyTypeNews',
}

const DIRECTION_EXAMPLES = [
  'storyAssistantDirectionEx1',
  'storyAssistantDirectionEx2',
  'storyAssistantDirectionEx3',
  'storyAssistantDirectionEx4',
  'storyAssistantDirectionEx5',
] as const

type Props = {
  songs: SongStorySource[]
  planId: PlanId
  aiEnabled: boolean
  aiOutputLang: AIOutputLang
  linkedSongId: string
  storyType: StoryType
  direction: string
  onLinkedSongIdChange: (id: string) => void
  onStoryTypeChange: (type: StoryType) => void
  onDirectionChange: (value: string) => void
  onApplyDraft: (draft: GeneratedStoryDraft, mode: 'merge' | 'replace') => void
  onToast: (message: string) => void
}

export default function ArtistStoryAssistant({
  songs,
  aiEnabled,
  aiOutputLang,
  linkedSongId,
  storyType,
  direction,
  onLinkedSongIdChange,
  onStoryTypeChange,
  onDirectionChange,
  onApplyDraft,
  onToast,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<GeneratedStoryDraft | null>(null)

  const selectedSong = useMemo(
    () => songs.find(s => s.id === linkedSongId) || null,
    [songs, linkedSongId],
  )

  const runGenerate = async () => {
    if (!selectedSong || !aiEnabled) return
    setGenerating(true)
    const { system, user } = buildStoryAssistantPrompt({
      ...selectedSong,
      storyType,
      direction,
      outputLang: aiOutputLang,
    })
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: user }],
          system,
          feature: 'story_assistant',
        }),
      })
      const json = await res.json()
      const draft = parseGeneratedStoryJson(json.content || json.text || '', selectedSong.title, storyType)
      if (!draft) {
        onToast(tx.storyGenerateError)
        return
      }
      setPreview(draft)
      onToast(tx.storyAssistantDraftReady)
    } catch {
      onToast(tx.storyGenerateError)
    } finally {
      setGenerating(false)
    }
  }

  const copyPreview = async () => {
    if (!preview) return
    const text = [preview.title, '', preview.excerpt, '', preview.body].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      onToast(tx.copied)
    } catch {
      onToast(tx.storyGenerateError)
    }
  }

  return (
    <div className="card workspace-card workspace-glass artist-story-assistant" style={{ marginBottom: 20 }}>
      <h3 className="workspace-card-title">{tx.storyAssistantTitle}</h3>
      <p className="workspace-section-desc" style={{ marginTop: 0 }}>{tx.storyAssistantDesc}</p>

      {!aiEnabled && (
        <UpgradePrompt compact title={tx.storyAiProTitle} description={tx.storyAiProDesc} />
      )}

      <label className="artist-stories-manager__label">{tx.storyFieldLinkedSong}</label>
      <select
        value={linkedSongId}
        onChange={e => onLinkedSongIdChange(e.target.value)}
        disabled={!songs.length}
      >
        <option value="">{tx.storyNoLinkedSong}</option>
        {songs.map(s => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>

      <label className="artist-stories-manager__label">{tx.storyFieldType}</label>
      <select value={storyType} onChange={e => onStoryTypeChange(e.target.value as StoryType)}>
        {STORY_TYPES.map(type => (
          <option key={type} value={type}>{tx[STORY_TYPE_LABEL_KEYS[type]]}</option>
        ))}
      </select>

      <label className="artist-stories-manager__label">{tx.storyAssistantDirectionLabel}</label>
      <textarea
        value={direction}
        onChange={e => onDirectionChange(e.target.value)}
        rows={4}
        placeholder={tx.storyAssistantDirectionPlaceholder}
        aria-describedby="story-assistant-direction-hints"
      />
      <ul id="story-assistant-direction-hints" className="artist-story-assistant__hints">
        {DIRECTION_EXAMPLES.map(key => (
          <li key={key}>
            <button
              type="button"
              className="artist-story-assistant__hint-btn"
              onClick={() => onDirectionChange(tx[key])}
            >
              {tx[key]}
            </button>
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className="btn-gold quick-action-btn"
          onClick={runGenerate}
          disabled={generating || !aiEnabled || !linkedSongId}
        >
          {generating ? tx.generating : preview ? tx.storyAssistantRegenerate : tx.storyAssistantGenerateDraft}
        </button>
      </div>

      {preview && (
        <div className="artist-story-assistant__preview card" style={{ marginTop: 16, padding: 14, borderColor: 'rgba(212,168,67,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="artist-story-assistant__draft-badge">{tx.storyStatusDraft}</span>
            <span style={{ color: '#8a7a60', fontSize: 12 }}>{tx.storyAssistantPreviewHint}</span>
          </div>
          <h4 style={{ margin: '0 0 6px', color: '#e8e0d0', fontWeight: 500 }}>{preview.title}</h4>
          {preview.excerpt && (
            <p style={{ margin: '0 0 10px', color: '#a89878', fontSize: 13, lineHeight: 1.5 }}>{preview.excerpt}</p>
          )}
          <pre className="artist-story-assistant__preview-body">{preview.body.slice(0, 1200)}{preview.body.length > 1200 ? '…' : ''}</pre>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn-outline quick-action-btn" onClick={() => onApplyDraft(preview, 'merge')}>
              {tx.storyAssistantInsert}
            </button>
            <button type="button" className="btn-outline quick-action-btn" onClick={() => onApplyDraft(preview, 'replace')}>
              {tx.storyAssistantReplace}
            </button>
            <button type="button" className="btn-outline quick-action-btn" onClick={copyPreview}>
              {tx.storyAssistantCopy}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
