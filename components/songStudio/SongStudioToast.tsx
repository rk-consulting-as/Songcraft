'use client'

import { useEffect } from 'react'

type Props = {
  message: string
  tone?: 'success' | 'error' | 'info' | 'warning'
  onDismiss: () => void
  durationMs?: number
}

export default function SongStudioToast({ message, tone = 'info', onDismiss, durationMs = 3200 }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, durationMs, onDismiss])

  return (
    <div
      className={`song-studio-toast song-studio-toast--${tone}`}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button type="button" className="song-studio-toast__close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
