'use client'

import { t, useLang } from '@/lib/i18n'

type SunoPreview = {
  id: string | null
  sunoUrl: string
  title: string | null
  coverUrl: string | null
  audioUrl: string | null
  description: string | null
  tags: string | null
  lyrics: string | null
}

type Props = {
  song: { suno_url?: string | null; suno_audio_url?: string | null } | null
  sunoPreview: SunoPreview | null
  sunoUrlInput: string
  onUrlInputChange: (value: string) => void
  onFetch: () => void
  sunoFetching: boolean
  sunoError: string | null
  sunoSaving: boolean
  hasLyrics: boolean
  onSave: (opts: { useCover: boolean; useLyrics: boolean }) => void
  onClearSaved: () => void
  onDismissPreview: () => void
}

const FUTURE_SOURCES = ['Spotify', 'YouTube', 'Local file', 'WAV/MP3 upload'] as const

export default function ImportFinishedTrackCard({
  song,
  sunoPreview,
  sunoUrlInput,
  onUrlInputChange,
  onFetch,
  sunoFetching,
  sunoError,
  sunoSaving,
  hasLyrics,
  onSave,
  onClearSaved,
  onDismissPreview,
}: Props) {
  const tx = t[useLang()] as Record<string, string>

  return (
    <section className="card song-studio-import-track" aria-labelledby="import-finished-track-title">
      <h3 id="import-finished-track-title" className="workspace-card-title">{tx.importFinishedTrackTitle}</h3>
      <p className="workspace-section-desc">{tx.importFromSunoHint}</p>

      <div className="song-studio-import-track__sources">
        <div className="song-studio-import-track__source song-studio-import-track__source--active">
          <span className="song-studio-import-track__source-label">{tx.importFromSuno}</span>
        </div>
        {FUTURE_SOURCES.map(source => (
          <div key={source} className="song-studio-import-track__source song-studio-import-track__source--future">
            <span className="song-studio-import-track__source-label">{source}</span>
            <span className="song-studio-import-track__source-badge">{tx.importComingLater}</span>
          </div>
        ))}
      </div>

      {song?.suno_url && !sunoPreview && (
        <div className="song-studio-import-track__saved">
          <div className="song-studio-import-track__saved-head">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="song-studio-import-track__saved-label">✓ {tx.sunoImportSaved}</div>
              <a href={song.suno_url} target="_blank" rel="noopener noreferrer" className="song-studio-import-track__saved-url">{song.suno_url}</a>
            </div>
            <button type="button" className="btn-outline" style={{ padding: '4px 12px', fontSize: 11 }} onClick={onClearSaved}>
              {tx.sunoImportClear}
            </button>
          </div>
          {song.suno_audio_url && (
            <audio src={song.suno_audio_url} controls className="song-studio-import-track__audio" />
          )}
        </div>
      )}

      <div className="song-studio-import-track__form">
        <input
          value={sunoUrlInput}
          onChange={e => onUrlInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onFetch() }}
          placeholder={tx.sunoImportPlaceholder}
          aria-label={tx.importFromSuno}
        />
        <button
          type="button"
          className="btn-gold song-studio-import-track__fetch"
          onClick={onFetch}
          disabled={sunoFetching || !sunoUrlInput.trim()}
        >
          {sunoFetching ? '...' : tx.sunoImportFetch}
        </button>
      </div>

      {sunoError && (
        <div className="song-studio-import-track__error" role="alert">{sunoError}</div>
      )}

      {sunoPreview && (
        <div className="song-studio-import-track__preview">
          <div className="song-studio-import-track__preview-body">
            {sunoPreview.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sunoPreview.coverUrl} alt={sunoPreview.title || ''} className="song-studio-import-track__cover" />
            ) : (
              <div className="song-studio-import-track__cover song-studio-import-track__cover--empty" aria-hidden>🎵</div>
            )}
            <div className="song-studio-import-track__preview-meta">
              <div className="song-studio-import-track__preview-title">{sunoPreview.title || '(untitled)'}</div>
              {sunoPreview.tags && <div className="song-studio-import-track__preview-tags">{sunoPreview.tags}</div>}
              {sunoPreview.description && (
                <div className="song-studio-import-track__preview-desc">{sunoPreview.description}</div>
              )}
              {sunoPreview.audioUrl && (
                <audio src={sunoPreview.audioUrl} controls className="song-studio-import-track__audio" />
              )}
            </div>
          </div>
          <div className="song-studio-import-track__preview-actions">
            <button
              type="button"
              className="btn-gold"
              onClick={() => onSave({ useCover: true, useLyrics: false })}
              disabled={sunoSaving}
            >
              {sunoSaving ? tx.saving : tx.sunoImportSave}
            </button>
            {sunoPreview.lyrics && !hasLyrics && (
              <button
                type="button"
                className="btn-outline"
                onClick={() => onSave({ useCover: true, useLyrics: true })}
                disabled={sunoSaving}
              >
                {tx.sunoImportSaveWithLyrics}
              </button>
            )}
            <button type="button" className="btn-outline" onClick={onDismissPreview}>{tx.cancel}</button>
          </div>
        </div>
      )}
    </section>
  )
}
