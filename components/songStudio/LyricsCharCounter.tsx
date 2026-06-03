'use client'

import {
  SUNO_LYRICS_MAX,
  formatLyricsCounter,
  getLyricsCharCount,
  getLyricsLengthState,
} from '@/lib/lyrics/sunoLength'

type Props = {
  text: string
  label?: string
  hint?: string
}

export default function LyricsCharCounter({ text, label, hint }: Props) {
  const count = getLyricsCharCount(text)
  const state = getLyricsLengthState(count)

  return (
    <div className="song-studio-lyrics-counter" aria-live="polite">
      <div className="song-studio-lyrics-counter__row">
        {label && <span className="song-studio-lyrics-counter__label">{label}</span>}
        <span
          className={`song-studio-lyrics-counter__value song-studio-lyrics-counter__value--${state}`}
          aria-label={`${count} of ${SUNO_LYRICS_MAX} characters`}
        >
          {formatLyricsCounter(count)}
        </span>
      </div>
      {hint && <p className="song-studio-lyrics-counter__hint">{hint}</p>}
    </div>
  )
}
