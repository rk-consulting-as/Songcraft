'use client'

import { useEffect, useState } from 'react'
import {
  hasCreativeDirectionContent,
  INSPIRATION_TRAIT_KEYS,
  mergePublishContentCreativeDirection,
  sanitizeExternalReferences,
  type CreativeDirection,
  type InspirationTrait,
} from '@/lib/songCreation/creativeDirection'
import { t, useLang } from '@/lib/i18n'

const TRAIT_LABEL_KEYS: Record<InspirationTrait, string> = {
  mood: 'inspirationTraitMood',
  energy: 'inspirationTraitEnergy',
  structure: 'inspirationTraitStructure',
  instrumentation: 'inspirationTraitInstrumentation',
  vocal_style: 'inspirationTraitVocalStyle',
  rhythm_groove: 'inspirationTraitRhythmGroove',
  atmosphere: 'inspirationTraitAtmosphere',
  lyrical_themes: 'inspirationTraitLyricalThemes',
  production_style: 'inspirationTraitProductionStyle',
}

type Props = {
  direction: CreativeDirection | null
  publishContent: Record<string, unknown>
  onSave: (publishContent: Record<string, unknown>) => Promise<void>
  onApplyLyrics: () => void
  onApplySuno: () => void
  compact?: boolean
}

export default function SongCreativeDirectionPanel({
  direction,
  publishContent,
  onSave,
  onApplyLyrics,
  onApplySuno,
  compact = false,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [artists, setArtists] = useState('')
  const [songs, setSongs] = useState('')
  const [traits, setTraits] = useState<Set<InspirationTrait>>(new Set())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!direction) return
    setArtists((direction.external_reference_artists || []).join(', '))
    setSongs((direction.external_reference_songs || []).join(', '))
    setTraits(new Set(direction.inspiration_traits || []))
    setNotes(direction.user_direction || '')
  }, [direction, editing])

  if (!hasCreativeDirectionContent(direction)) {
    return (
      <div className="card workspace-card workspace-glass song-creative-direction song-creative-direction--empty">
        <h3 className="workspace-card-title">{tx.creativeDirectionTitle}</h3>
        <p className="workspace-section-desc">{tx.creativeDirectionEmpty}</p>
        <button type="button" className="btn-outline quick-action-btn" onClick={() => setEditing(true)}>
          {tx.creativeDirectionEdit}
        </button>
        {editing && (
          <CreativeDirectionEditor
            tx={tx}
            artists={artists}
            songs={songs}
            traits={traits}
            notes={notes}
            onArtistsChange={setArtists}
            onSongsChange={setSongs}
            onTraitsChange={setTraits}
            onNotesChange={setNotes}
            onCancel={() => setEditing(false)}
            onSave={async () => {
              setSaving(true)
              const payload: CreativeDirection = {
                ...(direction || {}),
                external_reference_artists: sanitizeExternalReferences(artists),
                external_reference_songs: sanitizeExternalReferences(songs),
                inspiration_traits: Array.from(traits),
                user_direction: notes.trim() || undefined,
              }
              await onSave(mergePublishContentCreativeDirection(publishContent, payload))
              setSaving(false)
              setEditing(false)
            }}
            saving={saving}
          />
        )}
      </div>
    )
  }

  const traitLabels = (direction?.inspiration_traits || [])
    .map(tr => tx[TRAIT_LABEL_KEYS[tr]] || tr)

  return (
    <div className={`card workspace-card workspace-glass song-creative-direction${compact ? ' song-creative-direction--compact' : ''}`}>
      <div className="song-creative-direction__header">
        <h3 className="workspace-card-title">{tx.creativeDirectionTitle}</h3>
        <button type="button" className="btn-outline quick-action-btn" onClick={() => setEditing(v => !v)}>
          {editing ? tx.cancel : tx.creativeDirectionEdit}
        </button>
      </div>

      {!editing ? (
        <>
          {direction?.internal_reference_song_titles?.length ? (
            <p className="song-creative-direction__row">
              <span className="song-creative-direction__label">{tx.creativeDirectionInternalRefs}</span>
              <span>{direction.internal_reference_song_titles.join(', ')}</span>
            </p>
          ) : null}
          {direction?.external_reference_artists?.length ? (
            <p className="song-creative-direction__row">
              <span className="song-creative-direction__label">{tx.creativeDirectionExternalArtists}</span>
              <span>{direction.external_reference_artists.join(', ')}</span>
            </p>
          ) : null}
          {direction?.external_reference_songs?.length ? (
            <p className="song-creative-direction__row">
              <span className="song-creative-direction__label">{tx.creativeDirectionExternalSongs}</span>
              <span>{direction.external_reference_songs.join(', ')}</span>
            </p>
          ) : null}
          {traitLabels.length > 0 && (
            <p className="song-creative-direction__row">
              <span className="song-creative-direction__label">{tx.creativeDirectionTraits}</span>
              <span>{traitLabels.join(' · ')}</span>
            </p>
          )}
          {direction?.user_direction && (
            <p className="song-creative-direction__notes">{direction.user_direction}</p>
          )}
          {direction?.generated_concept_summary && !compact && (
            <p className="workspace-section-desc song-creative-direction__summary">{direction.generated_concept_summary}</p>
          )}
          <div className="song-creative-direction__actions">
            <button type="button" className="btn-outline quick-action-btn" onClick={onApplyLyrics}>
              {tx.creativeDirectionApplyLyrics}
            </button>
            <button type="button" className="btn-outline quick-action-btn" onClick={onApplySuno}>
              {tx.creativeDirectionApplySuno}
            </button>
          </div>
        </>
      ) : (
        <CreativeDirectionEditor
          tx={tx}
          artists={artists}
          songs={songs}
          traits={traits}
          notes={notes}
          onArtistsChange={setArtists}
          onSongsChange={setSongs}
          onTraitsChange={setTraits}
          onNotesChange={setNotes}
          onCancel={() => setEditing(false)}
          onSave={async () => {
            setSaving(true)
            const payload: CreativeDirection = {
              ...(direction || {}),
              external_reference_artists: sanitizeExternalReferences(artists),
              external_reference_songs: sanitizeExternalReferences(songs),
              inspiration_traits: Array.from(traits),
              user_direction: notes.trim() || undefined,
            }
            await onSave(mergePublishContentCreativeDirection(publishContent, payload))
            setSaving(false)
            setEditing(false)
          }}
          saving={saving}
        />
      )}
    </div>
  )
}

function CreativeDirectionEditor({
  tx,
  artists,
  songs,
  traits,
  notes,
  onArtistsChange,
  onSongsChange,
  onTraitsChange,
  onNotesChange,
  onCancel,
  onSave,
  saving,
}: {
  tx: Record<string, string>
  artists: string
  songs: string
  traits: Set<InspirationTrait>
  notes: string
  onArtistsChange: (v: string) => void
  onSongsChange: (v: string) => void
  onTraitsChange: (v: Set<InspirationTrait>) => void
  onNotesChange: (v: string) => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
}) {
  const toggleTrait = (trait: InspirationTrait) => {
    onTraitsChange(
      (() => {
        const next = new Set(traits)
        if (next.has(trait)) next.delete(trait)
        else next.add(trait)
        return next
      })(),
    )
  }

  return (
    <div className="song-creative-direction__editor">
      <label className="song-creative-direction__field-label">{tx.externalInspirationArtists}</label>
      <input value={artists} onChange={e => onArtistsChange(e.target.value)} placeholder={tx.externalInspirationArtistsPlaceholder} />
      <label className="song-creative-direction__field-label">{tx.externalInspirationSongs}</label>
      <input value={songs} onChange={e => onSongsChange(e.target.value)} placeholder={tx.externalInspirationSongsPlaceholder} />
      <p className="song-creative-direction__field-label">{tx.externalInspirationBorrow}</p>
      <div className="song-creation-inspiration__controls-grid">
        {INSPIRATION_TRAIT_KEYS.map(trait => (
          <label key={trait} className="song-creation-control-chip">
            <input type="checkbox" checked={traits.has(trait)} onChange={() => toggleTrait(trait)} />
            <span>{tx[TRAIT_LABEL_KEYS[trait]]}</span>
          </label>
        ))}
      </div>
      <label className="song-creative-direction__field-label">{tx.externalInspirationNotes}</label>
      <textarea value={notes} onChange={e => onNotesChange(e.target.value)} rows={3} placeholder={tx.externalInspirationNotesPlaceholder} />
      <div className="song-creative-direction__actions">
        <button type="button" className="btn-gold quick-action-btn" onClick={onSave} disabled={saving}>
          {saving ? tx.saving : tx.save}
        </button>
        <button type="button" className="btn-outline quick-action-btn" onClick={onCancel}>{tx.cancel}</button>
      </div>
    </div>
  )
}
