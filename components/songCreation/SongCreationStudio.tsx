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
  created_at?: string
  spotify_release_date?: string | null
  proposal_meta?: { genre?: string; mood?: string } | null
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

function statusLabel(status: string | null | undefined, tx: Record<string, string>): string {
  const map: Record<string, string> = {
    draft: tx.draft,
    in_progress: tx.inProgress,
    complete: tx.complete,
    released: tx.released,
  }
  return map[status || ''] || status || ''
}

function songChipMeta(song: CatalogSong, tx: Record<string, string>): string {
  const parts: string[] = []
  if (song.spotify_release_date) {
    parts.push(song.spotify_release_date.slice(0, 4))
  } else if (song.created_at) {
    parts.push(String(new Date(song.created_at).getFullYear()))
  }
  if (song.status) parts.push(statusLabel(song.status, tx))
  const pm = song.proposal_meta
  if (pm?.genre) parts.push(pm.genre)
  if (pm?.mood) parts.push(pm.mood)
  return parts.join(' · ')
}

function ContextCard({
  id,
  title,
  hint,
  summary,
  checked,
  onChange,
}: {
  id: string
  title: string
  hint: string
  summary: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className={`song-creation-context-card${checked ? ' is-selected' : ''}`}
    >
      <input
        id={id}
        type="checkbox"
        className="song-creation-context-card__input"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="song-creation-context-card__indicator" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className="song-creation-context-card__body">
        <span className="song-creation-context-card__title">{title}</span>
        <span className="song-creation-context-card__hint">{hint}</span>
        {summary && <span className="song-creation-context-card__summary">{summary}</span>}
      </span>
    </label>
  )
}

function StepHeading({ id, label }: { id: string; label: string }) {
  return (
    <h3 id={id} className="song-creation-step__title">
      {label}
    </h3>
  )
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

  const profileSummary = useMemo(() => {
    const parts: string[] = []
    if (artist.genre?.trim()) parts.push(artist.genre.trim())
    if (artist.description?.trim()) {
      const d = artist.description.trim()
      parts.push(d.length > 72 ? `${d.slice(0, 72)}…` : d)
    }
    if (artist.song_structure?.trim()) parts.push(artist.song_structure.trim())
    return parts.join(' · ')
  }, [artist])

  const productionSummary = useMemo(
    () => [...productionProfile.genres, ...productionProfile.traits].slice(0, 8).join(' · '),
    [productionProfile]
  )

  const hasProfileContext = !!(artist.genre || artist.description || artist.song_structure)
  const inspirationSongs = songs.filter(s => inspirationIds.has(s.id))

  const toggleInspiration = (id: string) => {
    setInspirationIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
    <div className="card song-creation-studio workspace-card workspace-glass">
      <header className="song-creation-studio__header">
        <div>
          <h2 className="song-creation-studio__heading">{tx.createNewSong}</h2>
          <p className="song-creation-studio__subheading">{tx.aiGenerator}</p>
        </div>
        <button type="button" className="btn-outline song-creation-studio__close" onClick={onClose}>
          {tx.close}
        </button>
      </header>

      {planId === 'free' && <UpgradePrompt compact title={tx.upgradeAiTitle} description={tx.upgradeAiDesc} />}

      <section className="song-creation-step" aria-labelledby="song-creation-step-1">
        <StepHeading id="song-creation-step-1" label={tx.songCreationStep1} />
        <div className={`song-creation-context-grid${hasProfileContext ? '' : ' song-creation-context-grid--single'}`}>
          {hasProfileContext && (
            <ContextCard
              id="song-creation-use-profile"
              title={tx.songCreationArtistProfileCard}
              hint={tx.useArtistProfileHint}
              summary={profileSummary}
              checked={useProfile}
              onChange={setUseProfile}
            />
          )}
          <ContextCard
            id="song-creation-use-production-dna"
            title={tx.songCreationProductionDnaCard}
            hint={tx.useProductionDnaHint}
            summary={productionSummary || productionProfile.label}
            checked={useProductionDna}
            onChange={setUseProductionDna}
          />
        </div>
      </section>

      <section className="song-creation-step" aria-labelledby="song-creation-step-2">
        <StepHeading id="song-creation-step-2" label={tx.songCreationStep2} />
        {songs.length === 0 ? (
          <p className="song-creation-empty">{tx.songCreationEmptyInspiration}</p>
        ) : (
          <>
            <div className="song-creation-inspiration__toolbar">
              <button type="button" className="btn-outline quick-action-btn" onClick={selectAllInspiration}>
                {tx.inspirationSelectAll}
              </button>
              <button type="button" className="btn-outline quick-action-btn" onClick={clearInspiration}>
                {tx.inspirationClearSelection}
              </button>
              <span className="song-creation-inspiration__count">
                {tx.songCreationSelectedCount.replace('{n}', String(inspirationIds.size))}
              </span>
            </div>
            <div className="song-creation-inspiration__grid" role="group" aria-label={tx.inspirationSourcesTitle}>
              {songs.map(s => {
                const selected = inspirationIds.has(s.id)
                const meta = songChipMeta(s, tx)
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`song-creation-inspiration-chip${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleInspiration(s.id)}
                  >
                    <span className="song-creation-inspiration-chip__check" aria-hidden="true">
                      {selected ? '✓' : ''}
                    </span>
                    <span className="song-creation-inspiration-chip__text">
                      <span className="song-creation-inspiration-chip__title">{s.title}</span>
                      {meta && <span className="song-creation-inspiration-chip__meta">{meta}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            {inspirationIds.size > 0 && (
              <div className="song-creation-inspiration__controls">
                <p className="song-creation-inspiration__controls-label">{tx.inspirationAnalyzeLabel}</p>
                <div className="song-creation-inspiration__controls-grid">
                  {controlLabels.map(({ key, labelKey }) => (
                    <label key={key} className="song-creation-control-chip">
                      <input
                        type="checkbox"
                        checked={inspirationControls[key]}
                        onChange={() => toggleControl(key)}
                      />
                      <span>{tx[labelKey]}</span>
                    </label>
                  ))}
                </div>
                <label className="song-creation-song-dna-toggle">
                  <input
                    type="checkbox"
                    checked={useSongDna}
                    onChange={e => setUseSongDna(e.target.checked)}
                  />
                  <span>{tx.useSongDna}</span>
                </label>
              </div>
            )}
          </>
        )}
      </section>

      <section className="song-creation-step" aria-labelledby="song-creation-step-3">
        <StepHeading id="song-creation-step-3" label={tx.songCreationStep3} />
        <label className="song-creation-idea-label" htmlFor="song-creation-prompt">
          {tx.describeTheme}
        </label>
        <textarea
          id="song-creation-prompt"
          className="song-creation-idea-input"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={tx.themePlaceholder}
          rows={4}
        />
      </section>

      <section className="song-creation-step song-creation-step--generate" aria-labelledby="song-creation-step-4">
        <StepHeading id="song-creation-step-4" label={tx.songCreationStep4} />
        <div className="song-creation-generate-card">
          <div className="song-creation-generate-card__settings">
            <span className="song-creation-generate-card__settings-label">{tx.songCreationGenerateSettings}</span>
            <div className="song-creation-count-row">
              <span className="song-creation-count-label">{tx.numberOfSongs}</span>
              <div className="song-creation-count-picker" role="group" aria-label={tx.numberOfSongs}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`song-creation-count-btn${count === n ? ' is-active' : ''}`}
                    aria-pressed={count === n}
                    onClick={() => setCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="song-creation-generate-card__provider-row">
              <AIProviderPicker value={aiProvider} onChange={onPickProvider} disabled={generating} />
              <label className="song-creation-lang-label">
                <span className="visually-hidden">{tx.aiOutputLangHint}</span>
                <select
                  value={aiOutputLang}
                  onChange={e => onAiOutputLangChange(normalizeAIOutputLang(e.target.value))}
                  disabled={generating}
                  className="song-creation-lang-select"
                >
                  {AI_OUTPUT_LANGUAGES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <button
            type="button"
            className="btn-gold song-creation-generate-btn"
            onClick={generateBatch}
            disabled={generating || !prompt.trim()}
          >
            {generating ? tx.planningText.replace('{n}', String(count)) : tx.generateProposals.replace('{n}', String(count))}
          </button>
        </div>
      </section>

      {generating && (
        <div className="song-creation-skeletons" aria-busy="true">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="song-creation-skeleton" />
          ))}
        </div>
      )}

      {generatedSongs.length > 0 && (
        <section className="song-creation-proposals">
          <p className="song-creation-proposals__label">{tx.proposalPreviewTitle}</p>
          {generatedSongs.map((s, i) => (
            <article key={i} className="song-creation-proposal card workspace-card">
              <div className="song-creation-proposal__head">
                <span className="song-creation-proposal__index">#{i + 1}</span>
                <label className="visually-hidden" htmlFor={`proposal-title-${i}`}>{tx.songTitle}</label>
                <input
                  id={`proposal-title-${i}`}
                  value={s.title}
                  onChange={e => updateGenerated(i, 'title', e.target.value)}
                  className="song-creation-proposal__title-input"
                />
              </div>
              <SongDNAProposalSummary dna={s.dna} genre={s.genre} mood={s.mood} />
              <label className="visually-hidden" htmlFor={`proposal-instructions-${i}`}>{tx.instructions}</label>
              <textarea
                id={`proposal-instructions-${i}`}
                value={s.instructions}
                onChange={e => updateGenerated(i, 'instructions', e.target.value)}
                rows={4}
                className="song-creation-proposal__instructions"
              />
            </article>
          ))}
          <div className="song-creation-proposals__actions">
            <button type="button" className="btn-gold" onClick={saveAll} disabled={saving}>
              {saving ? tx.saving : tx.saveAll.replace('{n}', String(generatedSongs.length))}
            </button>
            <button type="button" className="btn-outline" onClick={generateBatch} disabled={generating}>
              {tx.regenerate}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
