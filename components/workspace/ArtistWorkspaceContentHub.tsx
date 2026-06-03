'use client'

import HubSubNav from '@/components/workspace/HubSubNav'
import type { ContentPanel } from '@/lib/artistWorkspaceTabs'
import { t, useLang } from '@/lib/i18n'

export default function ArtistWorkspaceContentHub({
  active,
  onChange,
  children,
}: {
  active: ContentPanel
  onChange: (panel: ContentPanel) => void
  children: React.ReactNode
}) {
  const tx = t[useLang()] as Record<string, string>
  const items = [
    { id: 'songs', label: tx.workspaceShellSongs },
    { id: 'albums', label: tx.albums },
    { id: 'media', label: tx.workspaceTabMedia },
    { id: 'stories', label: tx.workspaceShellStories },
  ]

  return (
    <div className="workspace-hub">
      <HubSubNav items={items} active={active} onChange={id => onChange(id as ContentPanel)} ariaLabel={tx.workspaceShellContent} />
      <div className="workspace-hub__body">{children}</div>
    </div>
  )
}
