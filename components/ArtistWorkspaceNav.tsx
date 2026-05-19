'use client'

import { useEffect, useRef } from 'react'
import { ARTIST_WORKSPACE_TABS, type ArtistWorkspaceTab } from '@/lib/artistWorkspaceTabs'
import { t, useLang, type Lang } from '@/lib/i18n'

const TAB_LABEL_KEYS: Record<ArtistWorkspaceTab, keyof (typeof t)['en']> = {
  overview: 'workspaceTabOverview',
  songs: 'workspaceTabSongs',
  campaigns: 'workspaceTabCampaigns',
  fanhub: 'workspaceTabFanHub',
  growth: 'workspaceTabGrowth',
  analytics: 'workspaceTabAnalytics',
  epk: 'workspaceTabEpk',
  public: 'workspaceTabPublic',
  events: 'workspaceTabEvents',
  settings: 'workspaceTabSettings',
}

export default function ArtistWorkspaceNav({
  active,
  onChange,
}: {
  active: ArtistWorkspaceTab
  onChange: (tab: ArtistWorkspaceTab) => void
}) {
  const lang = useLang()
  const tx = t[lang]
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <nav className="artist-workspace-nav" aria-label={tx.workspaceNavLabel}>
      <div ref={scrollRef} className="artist-workspace-nav-scroll" role="tablist">
        {ARTIST_WORKSPACE_TABS.map(tab => {
          const isActive = tab === active
          return (
            <button
              key={tab}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`artist-workspace-tab${isActive ? ' is-active' : ''}`}
              onClick={() => onChange(tab)}
            >
              {tx[TAB_LABEL_KEYS[tab]]}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
