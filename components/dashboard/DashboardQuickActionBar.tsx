'use client'

import Link from 'next/link'

type Props = {
  tx: Record<string, string>
  firstArtistId?: string
  onNewArtist: () => void
}

export default function DashboardQuickActionBar({ tx, firstArtistId, onNewArtist }: Props) {
  const songHref = firstArtistId ? `/artist/${firstArtistId}#songs` : undefined
  const storyHref = firstArtistId ? `/artist/${firstArtistId}#brand-stories` : undefined

  return (
    <nav className="dashboard-quick-bar" aria-label={tx.mobileQuickActions}>
      <button type="button" className="dashboard-quick-bar__btn" onClick={onNewArtist}>
        <span aria-hidden="true">+</span>
        <span>{tx.newArtist}</span>
      </button>
      {songHref ? (
        <Link href={songHref} className="dashboard-quick-bar__btn">
          <span aria-hidden="true">♪</span>
          <span>{tx.newSong}</span>
        </Link>
      ) : (
        <button type="button" className="dashboard-quick-bar__btn" disabled>
          <span aria-hidden="true">♪</span>
          <span>{tx.newSong}</span>
        </button>
      )}
      {songHref ? (
        <Link href={`${songHref}`} className="dashboard-quick-bar__btn">
          <span aria-hidden="true">✦</span>
          <span>{tx.cmdGenerateSong}</span>
        </Link>
      ) : (
        <button type="button" className="dashboard-quick-bar__btn" disabled>
          <span aria-hidden="true">✦</span>
          <span>{tx.cmdGenerateSong}</span>
        </button>
      )}
      {storyHref ? (
        <Link href={storyHref} className="dashboard-quick-bar__btn">
          <span aria-hidden="true">📖</span>
          <span>{tx.cmdCreateStory}</span>
        </Link>
      ) : (
        <button type="button" className="dashboard-quick-bar__btn" disabled>
          <span aria-hidden="true">📖</span>
          <span>{tx.cmdCreateStory}</span>
        </button>
      )}
      <Link href="/discover/campaigns" className="dashboard-quick-bar__btn">
        <span aria-hidden="true">🎧</span>
        <span>{tx.cmdCreatePlaylistCampaign}</span>
      </Link>
    </nav>
  )
}
