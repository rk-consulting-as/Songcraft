'use client'

import { useEffect, useRef } from 'react'
import { ARTIST_WORKSPACE_AREAS, type ArtistWorkspaceArea } from '@/lib/artistWorkspaceTabs'
import { t, useLang } from '@/lib/i18n'

const AREA_LABEL_KEYS: Record<ArtistWorkspaceArea, keyof (typeof t)['en']> = {
  overview: 'workspaceShellOverview',
  content: 'workspaceShellContent',
  promotion: 'workspaceShellPromotion',
  growth: 'workspaceShellGrowth',
  brand: 'workspaceShellBrand',
  settings: 'workspaceTabSettings',
}

export default function ArtistWorkspaceNav({
  active,
  onChange,
}: {
  active: ArtistWorkspaceArea
  onChange: (area: ArtistWorkspaceArea) => void
}) {
  const lang = useLang()
  const tx = t[lang]
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <nav className="artist-workspace-nav workspace-glass" aria-label={tx.workspaceNavLabel}>
      <div ref={scrollRef} className="artist-workspace-nav-scroll" role="tablist">
        {ARTIST_WORKSPACE_AREAS.map(area => {
          const isActive = area === active
          return (
            <button
              key={area}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`artist-workspace-tab${isActive ? ' is-active' : ''}`}
              onClick={() => onChange(area)}
            >
              {tx[AREA_LABEL_KEYS[area]]}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
