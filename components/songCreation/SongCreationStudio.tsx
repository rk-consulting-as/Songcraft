'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { generateArtistProductionProfile } from '@/lib/artistProductionProfiles'
import { parseConceptResponse, prepareConceptGeneration } from '@/lib/songCreation/generateConcepts'
import {
  DEFAULT_INSPIRATION_CONTROLS,
  type InspirationControls,
  type SongProposal,
} from '@/lib/songCreation/types'
import { normalizeSongDNA } from '@/lib/songDNA/types'
import AIProviderPicker from '@/components/AIProviderPicker'
import UpgradePrompt from '@/components/UpgradePrompt'
import { SongDNAProposalSummary } from '@/components/songCreation/SongDNAPanel'
import { AI_OUTPUT_LANGUAGES, normalizeAIOutputLang, type AIOutputLang } from '@/lib/aiOutputLanguage'
import type { AIProvider } from '@/lib/aiProvider'
import { t, useLang } from '@/lib/i18n'

type Artist = {
  id: string
  name: string
  genre?: string | null
  description?: string | null
  song_structure?: string | null
}

type CatalogSong = {
  id: string
  title: string
  status?: string | null
  lyrics_instructions?: string | null
  lyrics_text?: string | null
  backstory?: string | null
  song_dna?: Record<string, number> | null
}

type Props = {
  artist: Artist
  songs: CatalogSong[]
  planId: 'free' | 'pro'
  aiProvider: AIProvider
  aiOutputLang: AIOutputLang
  onPickProvider: (p: AIProvider) => void
  onAiOutputLangChange: (lang: AIOutputLang) => void
  onClose: () => void
  onSaved: (newSongs: CatalogSong[]) => void
}

export default function SongCreationStudio({
  artist,
  songs,
  planId,
  aiProvider,
  aiOutputLang,
  onPickProvider,
  onAiOutputLangChange,
  onClose,
  onSaved,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatedSongs, setGeneratedSongs] = useState<SongProposal[]>([])
  const [useProfile, setUseProfile] = useState(true)
  const [useProductionDna, setUseProductionDna] = useState(true)
  const [useSongDna, setUseSongDna] = useState(true)
  const [inspirationIds, setInspirationIds] = useState<Set<string>>(new Set())
  const [inspirationControls, setInspirationControls] = useState<InspirationControls>({
    ...DEFAULT_INSPIRATION_CONTROLS,
  })

  const productionProfile = useMemo(
    () => generateArtistProductionProfile(artist, songs),
    [artist, songs]
  )

  const inspirationSongs = songs.filter(s => inspirationIds.has(s.id))

  const toggleInspiration = (id: string, checked: boolean) => {
    setInspirationIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const selectAllInspiration = () => setInspirationIds(new Set(songs.map(s => s.id)))
  const clearInspiration = () => setInspirationIds(new Set())

  const toggleControl = (key: keyof InspirationControls) => {
    setInspirationControls(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const generateBatch = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setGeneratedSongs([])

    const referenceSongs = inspirationSongs.map(s => ({
      id: s.id,
      title: s.title,
      lyrics_instructions: s.lyrics_instructions,
      lyrics_text: s.lyrics_text,
      backstory: s.backstory,
      song_dna: s.song_dna ? normalizeSongDNA(s.song_dna) : null,
    }))

    const { system, userMessage } = prepareConceptGeneration(
      {
        useProfile,
        useProductionDna,
        useSongDna,
        inspirationSongIds: Array.from(inspirationIds),
        inspirationControls,
        count,
        prompt,
      },
      {
        name: artist.name,
        genre: artist.genre,
        description: artist.description,
        song_structure: artist.song_structure,
        useProfile,
        useProductionDna,
        productionProfile,
      },
      referenceSongs,
      aiOutputLang
    )

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        provider: aiProvider,
        messages: [{ role: 'user', content: userMessage }],
        system,
      }),
    })
    const data = await res.json()
    try {
      setGeneratedSongs(parseConceptResponse(data.text || '', count))
    } catch (e) {
      console.error('Parse error', e)
    }
    setGenerating(false)
  }

  const updateGenerated = (i: number, field: 'title' | 'instructions', value: string) => {
    setGeneratedSongs(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const saveAll = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('songs').insert(
      generatedSongs.map(s => ({
        artist_id: artist.id,
        user_id: user?.id,
        title: s.title,
        lyrics_instructions: s.instructions,
        status: 'draft',
        song_dna: s.dna || null,
        proposal_meta: s.genre || s.mood ? { genre: s.genre, mood: s.mood } : null,
      }))
    ).select()
    if (data) {
      onSaved(data as CatalogSong[])
      onClose()
      setGeneratedSongs([])
      setPrompt('')
    }
    setSaving(false)
  }

  const controlLabels: { key: keyof InspirationControls; labelKey: string }[] = [
    { key: 'themes', labelKey: 'inspirationThemes' },
    { key: 'storytelling', labelKey: 'inspirationStorytelling' },
    { key: 'atmosphere', labelKey: 'inspirationAtmosphere' },
    { key: 'structure', labelKey: 'inspirationStructure' },
    { key: 'chorusStyle', labelKey: 'inspirationChorusStyle' },
    { key: 'vocabulary', labelKey: 'inspirationVocabulary' },
    { key: 'melodicFeel', labelKey: 'inspirationMelodicFeel' },
  ]

  return (
    <div className="card song-creation-studio" style={{ marginBottom: 32, borderColor: 'rgba(212,168,67,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#d4a843', fontWeight: 'normal', fontSize: 18 }}>{tx.createNewSong}</h2>
        <button type="button" className="btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={onClose}>{tx.close}</button>
      </div>

      {planId === 'free' && <UpgradePrompt compact title={tx.upgradeAiTitle} description={tx.upgradeAiDesc} />}

      {(artist.genre || artist.description || artist.song_structure) && (
        <div className="song-creation-studio__toggle" style={{ background: useProfile ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${useProfile ? 'rgba(212,168,67,0.25)' : 'rgba(180,140,80,0.1)'}`, borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={useProfile} onChange={e => setUseProfile(e.target.checked)} style={{ accentColor: '#d4a843' }} />
            <span style={{ color: useProfile ? '#d4a843' : '#6a5a40', fontSize: 13 }}>{tx.useArtistProfile}</span>
          </label>
        </div>
      )}

      <div className="song-creation-studio__toggle" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.12)', borderRadius: 6, padding: '12px 16px', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={useProductionDna} onChange={e => setUseProductionDna(e.target.checked)} style={{ accentColor: '#d4a843', marginTop: 3 }} />
          <span>
            <span style={{ color: '#d4a843', fontSize: 13 }}>{tx.useProductionDna}</span>
            <span style={{ display: 'block', color: '#5a4a30', fontSize: 11, marginTop: 4 }}>
              {[...productionProfile.genres, ...productionProfile.traits].slice(0, 6).join(' · ')}
            </span>
          </span>
        </label>
      </div>

      {songs.length > 0 && (
        <section className="song-creation-studio__section" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 10px', color: '#d4a843', fontSize: 14, fontWeight: 'normal' }}>{tx.inspirationSourcesTitle}</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button type="button" className="btn-outline" style={{ fontSize: 11 }} onClick={selectAllInspiration}>{tx.inspirationSelectAll}</button>
            <button type="button" className="btn-outline" style={{ fontSize: 11 }} onClick={clearInspiration}>{tx.inspirationClearSelection}</button>
          </div>
          <div className="song-creation-studio__inspiration-list">
            {songs.map(s => (
              <label key={s.id} className="song-creation-studio__inspiration-item">
                <input type="checkbox" checked={inspirationIds.has(s.id)} onChange={e => toggleInspiration(s.id, e.target.checked)} />
                <span>{s.title}</span>
              </label>
            ))}
          </div>
          {inspirationIds.size > 0 && (
            <>
              <p style={{ color: '#8a7a60', fontSize: 11, margin: '12px 0 8px', letterSpacing: 1, textTransform: 'uppercase' }}>{tx.inspirationAnalyzeLabel}</p>
              <div className="song-creation-studio__controls">
                {controlLabels.map(({ key, labelKey }) => (
                  <label key={key} className="song-creation-studio__control-item">
                    <input type="checkbox" checked={inspirationControls[key]} onChange={() => toggleControl(key)} />
                    <span>{tx[labelKey]}</span>
                  </label>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: '#8a7a60', cursor: 'pointer' }}>
                <input type="checkbox" checked={useSongDna} onChange={e => setUseSongDna(e.target.checked)} style={{ accentColor: '#d4a843' }} />
                {tx.useSongDna}
              </label>
            </>
          )}
        </section>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>{tx.describeTheme}</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={tx.themePlaceholder} rows={4} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', color: '#8a7a60', fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>{tx.numberOfSongs}</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
            <button key={n} type="button" onClick={() => setCount(n)} style={{
              width: 42, height: 42, borderRadius: 4, cursor: 'pointer',
              border: count === n ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.2)',
              background: count === n ? 'rgba(212,168,67,0.15)' : 'transparent',
              color: count === n ? '#d4a843' : '#6a5a40',
              fontSize: 14, fontWeight: count === n ? 'bold' : 'normal',
            }}>{n}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: generatedSongs.length > 0 ? 28 : 0 }}>
        <button type="button" className="btn-gold" onClick={generateBatch} disabled={generating || !prompt.trim()}>
          {generating ? tx.planningText.replace('{n}', String(count)) : tx.generateProposals.replace('{n}', String(count))}
        </button>
        <AIProviderPicker value={aiProvider} onChange={onPickProvider} disabled={generating} />
        <select value={aiOutputLang} onChange={e => onAiOutputLangChange(normalizeAIOutputLang(e.target.value))} disabled={generating} style={{ width: 'auto', minWidth: 145, padding: '6px 9px', fontSize: 12 }}>
          {AI_OUTPUT_LANGUAGES.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {generating && (
        <div style={{ marginTop: 20 }}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(180,140,80,0.1)', borderRadius: 6, padding: 16, marginBottom: 10, opacity: 0.4 }}>
              <div style={{ height: 14, background: 'rgba(212,168,67,0.15)', borderRadius: 3, width: '40%', marginBottom: 10 }} />
              <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 3, width: '90%' }} />
            </div>
          ))}
        </div>
      )}

      {generatedSongs.length > 0 && (
        <div>
          <p style={{ color: '#8a7a60', fontSize: 12, letterSpacing: 1, marginBottom: 14 }}>{tx.proposalPreviewTitle}</p>
          {generatedSongs.map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, padding: 18, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#d4a843', fontSize: 13, fontWeight: 'bold', minWidth: 24 }}>#{i + 1}</span>
                <input value={s.title} onChange={e => updateGenerated(i, 'title', e.target.value)} style={{ fontSize: 15, flex: 1 }} />
              </div>
              <SongDNAProposalSummary dna={s.dna} genre={s.genre} mood={s.mood} />
              <textarea value={s.instructions} onChange={e => updateGenerated(i, 'instructions', e.target.value)} rows={4} style={{ fontSize: 13, color: '#a09080', marginTop: 12, width: '100%' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-gold" onClick={saveAll} disabled={saving}>
              {saving ? tx.saving : tx.saveAll.replace('{n}', String(generatedSongs.length))}
            </button>
            <button type="button" className="btn-outline" onClick={generateBatch} disabled={generating}>{tx.regenerate}</button>
          </div>
        </div>
      )}
    </div>
  )
}
