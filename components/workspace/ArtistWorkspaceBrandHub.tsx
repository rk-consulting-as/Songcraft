'use client'

import HubSubNav from '@/components/workspace/HubSubNav'
import type { BrandPanel } from '@/lib/artistWorkspaceTabs'
import { t, useLang } from '@/lib/i18n'

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
  const items = [
    { id: 'presence', label: tx.publicPresenceTitle },
    { id: 'public', label: tx.workspaceActionPublicPage },
    { id: 'epk', label: tx.workspaceActionEpk },
    { id: 'fanhub', label: tx.workspaceTabFanHub },
    { id: 'events', label: tx.eventsTitle },
    { id: 'analytics', label: tx.analyticsLabelArtistInsights },
  ]

  return (
    <div className="workspace-hub">
      <HubSubNav items={items} active={active} onChange={id => onChange(id as BrandPanel)} ariaLabel={tx.workspaceShellBrand} />
      <div className="workspace-hub__body">{children}</div>
    </div>
  )
}
