'use client'

import { useEffect, useState } from 'react'
import { isWorkspaceSidebarEnabled } from '@/lib/workspace/featureFlags'
import ArtistWorkspaceSidebar from './ArtistWorkspaceSidebar'
import type { ArtistWorkspaceArea } from '@/lib/artistWorkspaceTabs'

export default function ArtistWorkspaceShell({
  activeArea,
  onAreaChange,
  nav,
  children,
}: {
  activeArea: ArtistWorkspaceArea
  onAreaChange: (area: ArtistWorkspaceArea) => void
  nav: React.ReactNode
  children: React.ReactNode
}) {
  const [sidebarOn, setSidebarOn] = useState(false)

  useEffect(() => {
    setSidebarOn(isWorkspaceSidebarEnabled())
    const onStorage = () => setSidebarOn(isWorkspaceSidebarEnabled())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!sidebarOn) {
    return (
      <>
        {nav}
        {children}
      </>
    )
  }

  return (
    <div className="artist-workspace-shell">
      <ArtistWorkspaceSidebar active={activeArea} onChange={onAreaChange} />
      <div className="artist-workspace-shell__main">
        {nav}
        {children}
      </div>
    </div>
  )
}
