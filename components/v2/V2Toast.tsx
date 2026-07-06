'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type V2ToastContextValue = {
  showToast: (message: string) => void
}

const V2ToastContext = createContext<V2ToastContextValue | null>(null)

export function useV2Toast() {
  const ctx = useContext(V2ToastContext)
  if (!ctx) {
    return { showToast: (_msg: string) => {} }
  }
  return ctx
}

export function V2ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)

  const showToast = useCallback((text: string) => {
    setMessage(text)
    setVisible(true)
    window.setTimeout(() => setVisible(false), 2300)
  }, [])

  return (
    <V2ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`v2-toast${visible ? ' show' : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </V2ToastContext.Provider>
  )
}
