'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ARTIST_WORKSPACE_AREA_META,
  ARTIST_WORKSPACE_SHEET_ITEMS,
  ARTIST_WORKSPACE_SHEET_OPEN_EVENT,
  mobileSubNavForArea,
} from '@/lib/artistWorkspace/areaMeta'
import type { ArtistWorkspaceArea, WorkspaceRoute } from '@/lib/artistWorkspaceTabs'
import { t, useLang } from '@/lib/i18n'

type Props = {
  route: WorkspaceRoute
  applyRoute: (route: WorkspaceRoute) => void
}

export default function ArtistWorkspaceMobileNavigator({ route, applyRoute }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const areaStripRef = useRef<HTMLButtonElement>(null)
  const subStripRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    areaStripRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [route.area])

  useEffect(() => {
    subStripRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [route.area, route.contentPanel, route.promotionPanel, route.brandPanel])

  useEffect(() => {
    const open = () => setSheetOpen(true)
    window.addEventListener(ARTIST_WORKSPACE_SHEET_OPEN_EVENT, open)
    return () => window.removeEventListener(ARTIST_WORKSPACE_SHEET_OPEN_EVENT, open)
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
    (area: ArtistWorkspaceArea) => {
      applyRoute({
        area,
        contentPanel: route.contentPanel || 'songs',
        promotionPanel: route.promotionPanel || 'campaigns',
        brandPanel: route.brandPanel || 'overview',
      })
      setSheetOpen(false)
    },
    [applyRoute, route.brandPanel, route.contentPanel, route.promotionPanel],
  )

  const selectRoute = useCallback(
    (next: WorkspaceRoute) => {
      applyRoute(next)
      setSheetOpen(false)
    },
    [applyRoute],
  )

  const subNav = mobileSubNavForArea(route.area)

  const sheet = sheetOpen && mounted
    ? createPortal(
        <div className="artist-workspace-mobile-sheet" role="presentation">
          <button
            type="button"
            className="artist-workspace-mobile-sheet__backdrop"
            aria-label={tx.close}
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="artist-workspace-mobile-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-label={tx.artistWorkspaceNavLabel}
          >
            <div className="artist-workspace-mobile-sheet__handle" aria-hidden="true" />
            <h2 className="artist-workspace-mobile-sheet__title">{tx.artistWorkspaceNavLabel}</h2>
            <ul className="artist-workspace-mobile-sheet__list">
              {ARTIST_WORKSPACE_SHEET_ITEMS.map(item => {
                const isActive = item.match(route)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`artist-workspace-mobile-sheet__item${isActive ? ' is-active' : ''}`}
                      onClick={() => selectRoute(item.route)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="artist-workspace-mobile-sheet__icon" aria-hidden="true">{item.icon}</span>
                      <span className="artist-workspace-mobile-sheet__text">
                        <span className="artist-workspace-mobile-sheet__label">{tx[item.labelKey]}</span>
                        <span className="artist-workspace-mobile-sheet__desc">{tx[item.descKey]}</span>
                      </span>
                      {isActive && <span className="artist-workspace-mobile-sheet__check" aria-hidden="true">✓</span>}
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
      <nav className="artist-workspace-mobile-nav workspace-glass" aria-label={tx.artistWorkspaceNavLabel}>
        <div className="artist-workspace-mobile-nav__scroll" role="tablist">
          {ARTIST_WORKSPACE_AREA_META.map(item => {
            const isActive = item.area === route.area
            return (
              <button
                key={item.area}
                ref={isActive ? areaStripRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`artist-workspace-mobile-nav__tab${isActive ? ' is-active' : ''}`}
                onClick={() => selectArea(item.area)}
              >
                <span className="artist-workspace-mobile-nav__icon" aria-hidden="true">{item.icon}</span>
                {tx[item.labelKey]}
              </button>
            )
          })}
        </div>
        {subNav && subNav.length > 0 && (
          <div className="artist-workspace-mobile-nav__sub" role="tablist" aria-label={tx.artistWorkspaceSubNavLabel}>
            {subNav.map(item => {
              const isActive = item.match(route)
              return (
                <button
                  key={item.id}
                  ref={isActive ? subStripRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`artist-workspace-mobile-nav__sub-tab${isActive ? ' is-active' : ''}`}
                  onClick={() => selectRoute(item.route)}
                >
                  {tx[item.labelKey]}
                </button>
              )
            })}
          </div>
        )}
      </nav>
      {sheet}
    </>
  )
}
