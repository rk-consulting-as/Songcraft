'use client'

import Link from 'next/link'
import { getSongStudioAreaLabel, getSongStudioSubSectionLabel } from '@/lib/songStudio/workspaceContext'
import type { SongStudioRoute } from '@/lib/songStudio/routes'
import { t, useLang } from '@/lib/i18n'

type Props = {
  route: SongStudioRoute
  songTitle: string
  artistId?: string
  artistName?: string
  publicSongAvailable?: boolean
  publicSongHidden?: boolean
  songId: string
}

export default function SongStudioWorkspaceContext({
  route,
  songTitle,
  artistId,
  artistName,
  publicSongAvailable,
  publicSongHidden,
  songId,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const areaLabel = getSongStudioAreaLabel(route, tx)
  const subLabel = getSongStudioSubSectionLabel(route, tx)
  const showPublicSong = publicSongAvailable && !publicSongHidden

  return (
    <nav className="song-studio-workspace-context" aria-label={tx.songStudioBreadcrumbLabel}>
      <ol className="song-studio-workspace-context__trail">
        <li><Link href="/dashboard">{tx.dashboard}</Link></li>
        {artistId && artistName && (
          <li><Link href={`/artist/${artistId}`}>{artistName}</Link></li>
        )}
        <li><span aria-current={route.area === 'overview' ? 'page' : undefined}>{songTitle || tx.songTitle}</span></li>
        {route.area !== 'overview' && (
          <li><span>{areaLabel}</span></li>
        )}
        {subLabel && (
          <li><span aria-current="page">{subLabel}</span></li>
        )}
      </ol>
      <div className="song-studio-workspace-context__actions">
        {artistId && (
          <Link href={`/artist/${artistId}`} className="song-studio-workspace-context__action">
            {tx.songStudioOpenArtist}
          </Link>
        )}
        {artistId && (
          <Link href={`/growth?artist=${artistId}`} className="song-studio-workspace-context__action">
            {tx.songStudioOpenGrowthHub}
          </Link>
        )}
        {showPublicSong && (
          <Link href={`/s/${songId}`} target="_blank" rel="noopener noreferrer" className="song-studio-workspace-context__action">
            {tx.songStudioOpenPublicSong}
          </Link>
        )}
      </div>
    </nav>
  )
}
