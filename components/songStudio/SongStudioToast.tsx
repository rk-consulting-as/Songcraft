'use client'

import { useEffect } from 'react'

type ToastAction = {
  label: string
  onClick: () => void
  variant?: 'gold' | 'outline'
}

type Props = {
  message: string
  tone?: 'success' | 'error' | 'info' | 'warning'
  onDismiss: () => void
  durationMs?: number
  actions?: ToastAction[]
}

export default function SongStudioToast({
  message,
  tone = 'info',
  onDismiss,
  durationMs = 3200,
  actions,
}: Props) {
  useEffect(() => {
    if (actions?.length) return
    const timer = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, durationMs, onDismiss, actions])

  return (
    <div
      className={`song-studio-toast song-studio-toast--${tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="song-studio-toast__body">
        <span>{message}</span>
        {actions && actions.length > 0 && (
          <div className="song-studio-toast__actions">
            {actions.map(action => (
              <button
                key={action.label}
                type="button"
                className={action.variant === 'gold' ? 'btn-gold' : 'btn-outline'}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="song-studio-toast__close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}
