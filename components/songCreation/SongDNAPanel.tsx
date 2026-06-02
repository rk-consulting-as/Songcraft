'use client'

import { SONG_DNA_DIMENSIONS, type SongDNA } from '@/lib/songDNA/types'
import { t, useLang } from '@/lib/i18n'

const DNA_LABEL_KEYS: Record<string, string> = {
  energy: 'songDnaEnergy',
  darkness: 'songDnaDarkness',
  emotion: 'songDnaEmotion',
  storytelling: 'songDnaStorytelling',
  singalong: 'songDnaSingalong',
  radioAppeal: 'songDnaRadioAppeal',
  cinematicFeel: 'songDnaCinematicFeel',
}

type Props = {
  dna: SongDNA | null
  compact?: boolean
  genre?: string
  mood?: string
}

export function SongDNABars({ dna, compact, genre, mood }: Props) {
  const tx = t[useLang()] as Record<string, string>
  if (!dna) return <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.songDnaEmpty}</p>

  return (
    <div className="song-dna-panel">
      {(genre || mood) && !compact && (
        <div className="song-dna-panel__meta">
          {genre && <span>{tx.songDnaGenre}: {genre}</span>}
          {mood && <span>{tx.songDnaMood}: {mood}</span>}
        </div>
      )}
      <ul className="song-dna-panel__list">
        {SONG_DNA_DIMENSIONS.map(key => (
          <li key={key} className="song-dna-panel__row">
            <span className="song-dna-panel__label">{tx[DNA_LABEL_KEYS[key]] || key}</span>
            <span className="song-dna-panel__bar" aria-hidden="true">
              <span className="song-dna-panel__fill" style={{ width: `${(dna[key] / 10) * 100}%` }} />
            </span>
            <span className="song-dna-panel__value">{dna[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SongDNAPanel({
  dna,
  genre,
  mood,
  onRegenerate,
  regenerating,
}: Props & { onRegenerate?: () => void; regenerating?: boolean }) {
  const tx = t[useLang()] as Record<string, string>
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#d4a843', fontWeight: 'normal', fontSize: 18, margin: 0 }}>{tx.songDnaTitle}</h2>
        {onRegenerate && (
          <button type="button" className="btn-outline" style={{ fontSize: 12 }} onClick={onRegenerate} disabled={regenerating}>
            {regenerating ? tx.generating : tx.songDnaRegenerate}
          </button>
        )}
      </div>
      <p style={{ color: '#8a7a60', fontSize: 13, marginTop: 0, lineHeight: 1.5 }}>{tx.songDnaIntro}</p>
      <div className="card">
        <SongDNABars dna={dna} genre={genre} mood={mood} />
      </div>
    </div>
  )
}

export function SongDNAProposalSummary({
  dna,
  genre,
  mood,
}: {
  dna?: SongDNA
  genre?: string
  mood?: string
}) {
  const tx = t[useLang()] as Record<string, string>
  if (!dna) return null
  const highlights = [
    { key: 'songDnaEmotion', value: dna.emotion },
    { key: 'songDnaSingalong', value: dna.singalong },
    { key: 'songDnaDarkness', value: dna.darkness },
    { key: 'songDnaStorytelling', value: dna.storytelling },
  ]
  return (
    <div className="song-dna-proposal">
      {genre && <p style={{ margin: '0 0 4px', fontSize: 12, color: '#8a7a60' }}>{tx.songDnaGenre}: <span style={{ color: '#e8e0d0' }}>{genre}</span></p>}
      {mood && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#8a7a60' }}>{tx.songDnaMood}: <span style={{ color: '#e8e0d0' }}>{mood}</span></p>}
      <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6a5a40', letterSpacing: 1, textTransform: 'uppercase' }}>{tx.songDnaSummary}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 12px', fontSize: 12 }}>
        {highlights.map(h => (
          <span key={h.key} style={{ color: '#a09080' }}>{tx[h.key]}: <strong style={{ color: '#d4a843' }}>{h.value}</strong></span>
        ))}
      </div>
    </div>
  )
}
