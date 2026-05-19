'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { t, useLang } from '@/lib/i18n'
import { AI_OUTPUT_LANGUAGES, normalizeAIOutputLang, type AIOutputLang } from '@/lib/aiOutputLanguage'
import UpgradePrompt from '@/components/UpgradePrompt'
import { clientPublicUrl } from '@/lib/appUrl'

type Artist = {
  id: string
  name: string
  genre: string
  description: string
  song_structure: string
  page_enabled?: boolean
  page_slug?: string | null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export default function ArtistSettingsPanel({
  artist,
  planId,
  onSaved,
}: {
  artist: Artist
  planId: 'free' | 'pro'
  onSaved: (artist: Artist) => void
}) {
  const lang = useLang()
  const tx = t[lang]
  const [form, setForm] = useState({
    name: artist.name || '',
    genre: artist.genre || '',
    description: artist.description || '',
    song_structure: artist.song_structure || '',
    page_enabled: !!artist.page_enabled,
    page_slug: artist.page_slug || '',
  })
  const [aiOutputLang, setAiOutputLang] = useState<AIOutputLang>('en')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setForm({
      name: artist.name || '',
      genre: artist.genre || '',
      description: artist.description || '',
      song_structure: artist.song_structure || '',
      page_enabled: !!artist.page_enabled,
      page_slug: artist.page_slug || '',
    })
  }, [artist])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_ai_output_lang, preferred_song_lang')
        .eq('id', data.user.id)
        .maybeSingle()
      setAiOutputLang(
        normalizeAIOutputLang(
          (profile as any)?.preferred_ai_output_lang ||
            ((profile as any)?.preferred_song_lang === 'no' ? 'no' : 'en')
        )
      )
    })
  }, [])

  const saveArtist = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setMessage('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    const payload = {
      name: form.name.trim(),
      genre: form.genre.trim(),
      description: form.description.trim(),
      song_structure: form.song_structure.trim(),
      page_enabled: form.page_enabled,
      page_slug: form.page_enabled ? (form.page_slug || '').trim() || slugify(form.name) : null,
    }
    const { data, error } = await supabase
      .from('artists')
      .update(payload)
      .eq('id', artist.id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) {
      setMessage(error.message)
    } else if (data) {
      onSaved(data as Artist)
      setMessage(lang === 'no' ? 'Lagret' : 'Saved')
    }
    setSaving(false)
  }

  const saveAiLang = async (value: AIOutputLang) => {
    setAiOutputLang(value)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ preferred_ai_output_lang: value }).eq('id', user.id)
  }

  return (
    <div className="workspace-section">
      <div className="card workspace-card">
        <h2 className="workspace-section-title">{tx.workspaceSettingsTitle}</h2>
        <p style={{ color: '#8a7a60', fontSize: 13, margin: '0 0 16px', lineHeight: 1.55 }}>{tx.workspaceSettingsDesc}</p>

        <div className="workspace-form-grid">
          <div>
            <label>{tx.artistName}</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label>{tx.genre}</label>
            <input value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>{tx.description}</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>{tx.songStructure}</label>
            <textarea value={form.song_structure} onChange={e => setForm({ ...form, song_structure: e.target.value })} rows={4} placeholder={tx.songStructurePlaceholder} />
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(180,140,80,0.12)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={form.page_enabled}
              onChange={e => setForm(f => ({
                ...f,
                page_enabled: e.target.checked,
                page_slug: e.target.checked && !f.page_slug ? slugify(f.name) : f.page_slug,
              }))}
              style={{ accentColor: '#d4a843' }}
            />
            <span style={{ color: '#c8c0b0', fontSize: 13 }}>{tx.publicPageLabel}</span>
          </label>
          {form.page_enabled && (
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                value={form.page_slug}
                onChange={e => setForm({ ...form, page_slug: slugify(e.target.value) })}
                placeholder="artist-slug"
              />
              {form.page_slug && (
                <p style={{ color: '#6a5a40', fontSize: 12, margin: 0, wordBreak: 'break-all' }}>
                  {clientPublicUrl(`/p/${form.page_slug}`)}
                </p>
              )}
            </div>
          )}
        </div>

        <button type="button" className="btn-gold" onClick={saveArtist} disabled={saving} style={{ marginTop: 16 }}>
          {saving ? tx.saving : tx.save}
        </button>
        {message && <p style={{ color: '#7bc87b', fontSize: 12, margin: '10px 0 0' }}>{message}</p>}
      </div>

      <div className="card workspace-card" style={{ marginTop: 14 }}>
        <h3 className="workspace-card-title">{lang === 'no' ? 'AI-outputspråk' : 'AI output language'}</h3>
        <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 10px' }}>{tx.aiOutputLangHint}</p>
        <select value={aiOutputLang} onChange={e => saveAiLang(normalizeAIOutputLang(e.target.value))} style={{ maxWidth: 280 }}>
          {AI_OUTPUT_LANGUAGES.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {planId === 'free' && (
        <div style={{ marginTop: 14 }}>
          <UpgradePrompt compact title={tx.billingFeatureRemoveBranding} description={tx.upgradeEmbedDesc} />
        </div>
      )}
    </div>
  )
}
