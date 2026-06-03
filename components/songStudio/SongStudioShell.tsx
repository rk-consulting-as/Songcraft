'use client'

import type { SongStudioArea } from '@/lib/songStudio/routes'

export default function SongStudioShell({
  activeArea,
  nav,
  children,
}: {
  activeArea: SongStudioArea
  nav: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="song-studio-shell" data-area={activeArea}>
      {nav}
      <div className="song-studio-shell__body">{children}</div>
    </div>
  )
}
