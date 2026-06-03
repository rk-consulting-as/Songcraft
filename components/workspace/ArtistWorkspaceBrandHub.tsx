'use client'

import HubSubNav from '@/components/workspace/HubSubNav'
import type { BrandPanel } from '@/lib/artistWorkspaceTabs'
import { t, useLang } from '@/lib/i18n'

function normalizePanel(panel: BrandPanel): BrandPanel {
  if (panel === 'presence') return 'overview'
  if (panel === 'public') return 'sharing'
  return panel
}

export default function ArtistWorkspaceBrandHub({
  active,
  onChange,
  children,
}: {
  active: BrandPanel
  onChange: (panel: BrandPanel) => void
  children: React.ReactNode
}) {
  const tx = t[useLang()] as Record<string, string>
  const normalized = normalizePanel(active)
  const items = [
    { id: 'overview', label: tx.artistSiteStudioOverview },
    { id: 'theme', label: tx.artistSiteStudioTheme },
    { id: 'homepage', label: tx.artistSiteStudioHomepage },
    { id: 'stories', label: tx.artistSiteStudioStories },
    { id: 'seo', label: tx.artistSiteStudioSeo },
    { id: 'sharing', label: tx.artistSiteStudioSharing },
    { id: 'epk', label: tx.workspaceActionEpk },
    { id: 'fanhub', label: tx.workspaceTabFanHub },
    { id: 'events', label: tx.eventsTitle },
    { id: 'analytics', label: tx.analyticsLabelArtistInsights },
  ]

  return (
    <div className="workspace-hub artist-site-studio">
      <div className="artist-site-studio__title-row">
        <h2 className="workspace-section-title">{tx.artistSiteStudioTitle}</h2>
        <p className="workspace-section-desc">{tx.artistSiteStudioDesc}</p>
      </div>
      <HubSubNav
        items={items}
        active={normalized}
        onChange={id => onChange(id as BrandPanel)}
        ariaLabel={tx.artistSiteStudioTitle}
      />
      <div className="workspace-hub__body">{children}</div>
    </div>
  )
}
