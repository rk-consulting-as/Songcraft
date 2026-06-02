'use client'

import { useState } from 'react'
import {
  SUNO_HARD_MAX,
  sunoCharStatus,
  sunoCharStatusColor,
} from '@/lib/songCreation/compressSunoPrompt'
import { SUNO_CREATE_URL } from '@/lib/songCreation/exportPrompt'
import type { SunoPromptMode } from '@/lib/songCreation/types'
import { t, useLang } from '@/lib/i18n'

type Props = {
  prompt: string
  mode: SunoPromptMode
  onModeChange: (mode: SunoPromptMode) => void
  onCopy: () => void
}

export default function SunoPromptToolbar({ prompt, mode, onModeChange, onCopy }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [copied, setCopied] = useState(false)
  const len = prompt.length
  const status = sunoCharStatus(mode === 'compact' ? len : len)
  const counterColor = mode === 'compact' ? sunoCharStatusColor(status) : '#8a7a60'

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="suno-prompt-toolbar">
      <div className="suno-prompt-toolbar__modes">
        <button
          type="button"
          className={mode === 'compact' ? 'btn-gold' : 'btn-outline'}
          style={{ fontSize: 11, padding: '4px 12px' }}
          onClick={() => onModeChange('compact')}
        >
          {tx.sunoModeCompact}
        </button>
        <button
          type="button"
          className={mode === 'detailed' ? 'btn-gold' : 'btn-outline'}
          style={{ fontSize: 11, padding: '4px 12px' }}
          onClick={() => onModeChange('detailed')}
        >
          {tx.sunoModeDetailed}
        </button>
      </div>
      <div className="suno-prompt-toolbar__actions">
        {mode === 'compact' && (
          <span className="suno-prompt-toolbar__counter" style={{ color: counterColor }}>
            {len} / {SUNO_HARD_MAX}
          </span>
        )}
        <button type="button" className="btn-outline" style={{ padding: '4px 12px', fontSize: 12 }} onClick={handleCopy}>
          {copied ? `✓ ${tx.copied}` : `📋 ${tx.sunoCopyPrompt}`}
        </button>
        <a
          href={SUNO_CREATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
          style={{ padding: '4px 12px', fontSize: 12, textDecoration: 'none' }}
        >
          ↗ {tx.sunoOpenCreate}
        </a>
      </div>
    </div>
  )
}
