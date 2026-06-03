'use client'

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

export default function ArtistWorkspaceSidebar({
  active,
  onChange,
}: {
  active: ArtistWorkspaceArea
  onChange: (area: ArtistWorkspaceArea) => void
}) {
  const tx = t[useLang()]

  return (
    <aside className="artist-workspace-sidebar workspace-glass" aria-label={tx.workspaceNavLabel}>
      <nav className="artist-workspace-sidebar__nav">
        {ARTIST_WORKSPACE_AREAS.map(area => (
          <button
            key={area}
            type="button"
            className={`artist-workspace-sidebar__item${active === area ? ' is-active' : ''}`}
            onClick={() => onChange(area)}
          >
            {tx[AREA_LABEL_KEYS[area]]}
          </button>
        ))}
      </nav>
    </aside>
  )
}
