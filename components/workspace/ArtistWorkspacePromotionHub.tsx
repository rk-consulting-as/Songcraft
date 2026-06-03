'use client'

import HubSubNav from '@/components/workspace/HubSubNav'
import type { PromotionPanel } from '@/lib/artistWorkspaceTabs'
import { t, useLang } from '@/lib/i18n'

export default function ArtistWorkspacePromotionHub({
  active,
  onChange,
  children,
}: {
  active: PromotionPanel
  onChange: (panel: PromotionPanel) => void
  children: React.ReactNode
}) {
  const tx = t[useLang()] as Record<string, string>
  const items = [
    { id: 'campaigns', label: tx.workspaceTabCampaigns },
    { id: 'distribution', label: tx.workspaceShellDistribution },
    { id: 'playlists', label: tx.workspaceTabPlaylists },
  ]

  return (
    <div className="workspace-hub">
      <HubSubNav items={items} active={active} onChange={id => onChange(id as PromotionPanel)} ariaLabel={tx.workspaceShellPromotion} />
      <div className="workspace-hub__body">{children}</div>
    </div>
  )
}
