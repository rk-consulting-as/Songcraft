'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import UpgradePrompt from '@/components/UpgradePrompt'
import { t, useLang } from '@/lib/i18n'
import type { PlanId } from '@/lib/subscription'

const TEMPLATES = [
  { id: 'default', labelKey: 'publicBuilderThemeDefault', descKey: 'publicBuilderThemeDefaultDesc' },
  { id: 'minimal', labelKey: 'publicBuilderThemeMinimal', descKey: 'publicBuilderThemeMinimalDesc' },
  { id: 'cinematic', labelKey: 'publicBuilderThemeCinematic', descKey: 'publicBuilderThemeCinematicDesc' },
] as const

type Props = {
  artistId: string
  pageTemplate?: string | null
  accentColor?: string | null
  planId: PlanId
  onSaved: (patch: { page_template?: string; page_settings?: Record<string, unknown> }) => void
  pageSettings?: Record<string, unknown> | null
}

export default function ArtistSiteThemePanel({ artistId, pageTemplate, accentColor, planId, onSaved, pageSettings }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [saving, setSaving] = useState(false)
  const [accent, setAccent] = useState(accentColor || '#d4a843')

  const saveTemplate = async (template: string) => {
    if (planId === 'free' && template !== 'default') return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('artists').update({ page_template: template }).eq('id', artistId)
    setSaving(false)
    if (!error) onSaved({ page_template: template })
  }

  const saveAccent = async () => {
    setSaving(true)
    const supabase = createClient()
    const nextSettings = { ...(pageSettings || {}), accent_color: accent }
    const { error } = await supabase.from('artists').update({ page_settings: nextSettings }).eq('id', artistId)
    setSaving(false)
    if (!error) onSaved({ page_settings: nextSettings })
  }

  return (
    <div className="workspace-section artist-site-theme">
      <div className="card workspace-card workspace-glass">
        <h2 className="workspace-section-title">{tx.artistSiteThemeTitle}</h2>
        <p className="workspace-section-desc">{tx.publicBuilderThemesDesc}</p>
        {planId === 'free' && (
          <UpgradePrompt compact title={tx.publicPageTemplate} description={tx.publicBuilderThemesDesc} />
        )}
        <div className="public-theme-grid">
          {TEMPLATES.map(theme => {
            const active = (pageTemplate || 'default') === theme.id
            const locked = planId === 'free' && theme.id !== 'default'
            return (
              <button
                key={theme.id}
                type="button"
                className={`public-theme-card${active ? ' is-active' : ''}`}
                disabled={saving || locked}
                onClick={() => saveTemplate(theme.id)}
              >
                <span className="public-theme-card__name">{tx[theme.labelKey]}</span>
                <span className="public-theme-card__desc">{tx[theme.descKey]}</span>
                {active && <span className="public-theme-card__badge">{tx.publicBuilderThemeActive}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card workspace-card workspace-glass">
        <h3 className="workspace-card-title">{tx.artistSiteAccentTitle}</h3>
        <div className="artist-site-theme__accent-row">
          <input type="color" value={accent} onChange={e => setAccent(e.target.value)} aria-label={tx.artistSiteAccentTitle} />
          <button type="button" className="btn-outline quick-action-btn" onClick={saveAccent} disabled={saving}>{tx.save}</button>
        </div>
      </div>
    </div>
  )
}
