'use client'

import Link from 'next/link'
import { t, useLang } from '@/lib/i18n'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'

type Song = {
  id: string
  title: string
  status: string
  publish_content?: { distribution?: unknown } | null
}

export default function ArtistWorkspaceDistributionSummary({ songs }: { songs: Song[] }) {
  const tx = t[useLang()] as Record<string, string>
  const distributionSongs = songs.filter(s => {
    const pc = s.publish_content || {}
    return !!pc.distribution
  })

  return (
    <div className="workspace-section">
      <div className="card workspace-card workspace-glass">
        <h2 className="workspace-section-title">{tx.workspaceShellDistribution}</h2>
        <p className="workspace-section-desc">{tx.workspaceShellDistributionDesc}</p>
        {distributionSongs.length === 0 ? (
          <WorkspaceEmptyState
            icon="🚀"
            title={tx.workspaceShellDistributionEmpty}
            description={tx.workspaceShellDistributionEmptyDesc}
            action={
              distributionSongs.length === 0 && songs[0] ? (
                <Link href={`/song/${songs[0].id}`} className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
                  {tx.workspaceShellOpenSongDistribution}
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="workspace-list">
            {distributionSongs.map(song => (
              <Link key={song.id} href={`/song/${song.id}`} className="workspace-list-row">
                <span>{song.title}</span>
                <span style={{ color: '#d4a843', fontSize: 12 }}>{tx.workspaceShellManageDistribution} →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
