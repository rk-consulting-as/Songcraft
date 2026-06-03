'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t, useLang } from '@/lib/i18n'
import {
  SONG_STUDIO_AREA_META,
  SONG_STUDIO_SHEET_OPEN_EVENT,
  adjacentSongStudioArea,
} from '@/lib/songStudio/areaMeta'
import type { SongStudioArea } from '@/lib/songStudio/routes'

type Props = {
  active: SongStudioArea
  onChange: (area: SongStudioArea) => void
}

export default function SongStudioMobileNavigator({ active, onChange }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const activeStripRef = useRef<HTMLButtonElement>(null)
  const touchRef = useRef({ x: 0, y: 0, tracking: false })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    activeStripRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  useEffect(() => {
    const open = () => setSheetOpen(true)
    window.addEventListener(SONG_STUDIO_SHEET_OPEN_EVENT, open)
    return () => window.removeEventListener(SONG_STUDIO_SHEET_OPEN_EVENT, open)
  }, [])

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [sheetOpen])

  const selectArea = useCallback(
    (area: SongStudioArea) => {
      onChange(area)
      setSheetOpen(false)
    },
    [onChange],
  )

  useEffect(() => {
    const el = document.querySelector('.song-studio-body')
    if (!el) return

    const onTouchStart = (e: Event) => {
      if (sheetOpen) return
      const te = e as TouchEvent
      const t0 = te.touches[0]
      if (!t0) return
      touchRef.current = { x: t0.clientX, y: t0.clientY, tracking: true }
    }

    const onTouchEnd = (e: Event) => {
      if (!touchRef.current.tracking || sheetOpen) return
      touchRef.current.tracking = false
      const te = e as TouchEvent
      const t0 = te.changedTouches[0]
      if (!t0) return
      const dx = t0.clientX - touchRef.current.x
      const dy = t0.clientY - touchRef.current.y
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return
      const direction: 1 | -1 = dx < 0 ? 1 : -1
      onChange(adjacentSongStudioArea(active, direction))
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [active, onChange, sheetOpen])

  const sheet = sheetOpen && mounted
    ? createPortal(
        <div className="song-studio-mobile-sheet" role="presentation">
          <button
            type="button"
            className="song-studio-mobile-sheet__backdrop"
            aria-label={tx.close}
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="song-studio-mobile-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-label={tx.songStudioNavLabel}
          >
            <div className="song-studio-mobile-sheet__handle" aria-hidden="true" />
            <h2 className="song-studio-mobile-sheet__title">{tx.songStudioNavLabel}</h2>
            <ul className="song-studio-mobile-sheet__list">
              {SONG_STUDIO_AREA_META.map(item => {
                const isActive = item.area === active
                return (
                  <li key={item.area}>
                    <button
                      type="button"
                      className={`song-studio-mobile-sheet__item${isActive ? ' is-active' : ''}`}
                      onClick={() => selectArea(item.area)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="song-studio-mobile-sheet__icon" aria-hidden="true">{item.icon}</span>
                      <span className="song-studio-mobile-sheet__text">
                        <span className="song-studio-mobile-sheet__label">{tx[item.labelKey]}</span>
                        <span className="song-studio-mobile-sheet__desc">{tx[item.descKey]}</span>
                      </span>
                      {isActive && <span className="song-studio-mobile-sheet__check" aria-hidden="true">✓</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <nav className="song-studio-mobile-nav workspace-glass" aria-label={tx.songStudioNavLabel}>
        <div className="song-studio-mobile-nav__scroll" role="tablist">
          {SONG_STUDIO_AREA_META.map(item => {
            const isActive = item.area === active
            return (
              <button
                key={item.area}
                ref={isActive ? activeStripRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`song-studio-mobile-nav__tab${isActive ? ' is-active' : ''}`}
                onClick={() => onChange(item.area)}
              >
                <span className="song-studio-mobile-nav__icon" aria-hidden="true">{item.icon}</span>
                {tx[item.labelKey]}
              </button>
            )
          })}
        </div>
      </nav>
      {sheet}
    </>
  )
}
