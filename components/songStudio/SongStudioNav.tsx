'use client'

import { useEffect, useRef } from 'react'
import { SONG_STUDIO_AREAS, type SongStudioArea } from '@/lib/songStudio/routes'
import { t, useLang } from '@/lib/i18n'

const AREA_LABEL_KEYS: Record<SongStudioArea, string> = {
  overview: 'songStudioOverview',
  write: 'songStudioWrite',
  produce: 'songStudioProduce',
  promote: 'songStudioPromote',
  release: 'songStudioRelease',
  publish: 'songStudioPublish',
  settings: 'songStudioSettings',
}

export default function SongStudioNav({
  active,
  onChange,
}: {
  active: SongStudioArea
  onChange: (area: SongStudioArea) => void
}) {
  const tx = t[useLang()] as Record<string, string>
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <nav className="song-studio-nav workspace-glass" aria-label={tx.songStudioNavLabel}>
      <div className="song-studio-nav__scroll" role="tablist">
        {SONG_STUDIO_AREAS.map(area => {
          const isActive = area === active
          return (
            <button
              key={area}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              className={`song-studio-nav__tab${isActive ? ' is-active' : ''}`}
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
