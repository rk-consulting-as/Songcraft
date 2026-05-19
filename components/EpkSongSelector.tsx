'use client'

import { useMemo, useState } from 'react'
import { getEpkSongBlurb, getEpkSongCover, type EpkSong } from '@/lib/epkSongs'
import { t, useLang, type Lang } from '@/lib/i18n'

type Filter = 'all' | 'selected' | 'released' | 'draft'

export default function EpkSongSelector({
  songs,
  selectedIds,
  onToggle,
  onClearSelected,
}: {
  songs: EpkSong[]
  selectedIds: string[]
  onToggle: (songId: string, checked: boolean) => void
  onClearSelected?: () => void
}) {
  const [lang] = useState<Lang>(() => useLang())
  const tx = t[lang]
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return songs.filter(song => {
      if (filter === 'selected' && !selectedSet.has(song.id)) return false
      if (filter === 'released' && song.status !== 'released') return false
      if (filter === 'draft' && song.status !== 'draft') return false
      if (!q) return true
      const blurb = getEpkSongBlurb(song, 400).toLowerCase()
      return (
        song.title.toLowerCase().includes(q) ||
        (song.status || '').toLowerCase().includes(q) ||
        blurb.includes(q)
      )
    })
  }, [songs, search, filter, selectedSet])

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: tx.epkFilterAll },
    { id: 'selected', label: tx.epkFilterSelected },
    { id: 'released', label: tx.epkFilterReleased },
    { id: 'draft', label: tx.epkFilterDraft },
  ]

  return (
    <div className="epk-song-selector">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tx.epkSearchSongs}
          style={{ flex: '1 1 180px', minWidth: 0 }}
          aria-label={tx.epkSearchSongs}
        />
        {selectedIds.length > 0 && onClearSelected && (
          <button type="button" className="btn-outline" onClick={onClearSelected} style={{ padding: '6px 12px', fontSize: 12, flexShrink: 0 }}>
            {tx.epkClearSelected}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {filters.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              borderRadius: 999,
              cursor: 'pointer',
              border: filter === f.id ? '1px solid #7090d0' : '1px solid rgba(112,144,208,0.25)',
              background: filter === f.id ? 'rgba(112,144,208,0.15)' : 'transparent',
              color: filter === f.id ? '#a8c0f0' : '#8a7a60',
            }}
          >
            {f.label}
          </button>
        ))}
        <span style={{ color: '#6a5a40', fontSize: 11, alignSelf: 'center', marginLeft: 'auto' }}>
          {selectedIds.length} {tx.epkSelectedCount}
        </span>
      </div>

      {songs.length === 0 ? (
        <p style={{ color: '#6a5a40', fontSize: 13, margin: 0 }}>{tx.noSongs}</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#6a5a40', fontSize: 13, margin: 0 }}>{tx.epkNoSongsMatch}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
          {filtered.map(song => {
            const selected = selectedSet.has(song.id)
            const cover = getEpkSongCover(song)
            const blurb = getEpkSongBlurb(song, 120)
            return (
              <label
                key={song.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 52px minmax(0, 1fr)',
                  gap: 12,
                  alignItems: 'start',
                  padding: 12,
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: selected ? '1px solid rgba(112,144,208,0.45)' : '1px solid rgba(112,144,208,0.16)',
                  background: selected ? 'rgba(112,144,208,0.1)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={e => onToggle(song.id, e.target.checked)}
                  style={{ accentColor: '#7090d0', marginTop: 4 }}
                  aria-label={`${tx.epkSelectedSongs}: ${song.title}`}
                />
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      background: 'rgba(112,144,208,0.12)',
                      border: '1px solid rgba(112,144,208,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#7090d0',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    ♪
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{song.title}</span>
                    {song.status && (
                      <span style={{ color: '#7090d0', fontSize: 11, textTransform: 'capitalize' }}>{song.status}</span>
                    )}
                    {song.spotify_release_date && (
                      <span style={{ color: '#6a5a40', fontSize: 11 }}>{song.spotify_release_date}</span>
                    )}
                  </div>
                  {blurb ? (
                    <p style={{ color: '#8a7a60', fontSize: 12, lineHeight: 1.45, margin: 0 }}>{blurb}</p>
                  ) : (
                    <p style={{ color: '#5a4a38', fontSize: 12, margin: 0, fontStyle: 'italic' }}>{tx.epkNoSongBlurb}</p>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}

      <style>{`
        @media (max-width: 560px) {
          .epk-song-selector label {
            grid-template-columns: auto minmax(0, 1fr) !important;
          }
          .epk-song-selector label img,
          .epk-song-selector label > div[aria-hidden] {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
