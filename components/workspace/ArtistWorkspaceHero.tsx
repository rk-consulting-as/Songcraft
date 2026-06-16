'use client'

import Link from 'next/link'
import { t, useLang } from '@/lib/i18n'
import ArtistQuickActions, { type ArtistQuickAction } from './ArtistQuickActions'

type Props = {
  artistId: string
  name: string
  genre?: string | null
  avatarUrl?: string | null
  coverUrl?: string | null
  pageEnabled?: boolean
  pageSlug?: string | null
  stats: {
    songs: number
    followers: number
    campaigns: number
    playlists: number
  }
  onCreateSong: () => void
  onCreateReleaseCampaign: () => void
  onCopyPublicLink?: () => void
}

export default function ArtistWorkspaceHero({
  artistId,
  name,
  genre,
  avatarUrl,
  coverUrl,
  pageEnabled,
  pageSlug,
  stats,
  onCreateSong,
  onCreateReleaseCampaign,
  onCopyPublicLink,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const genres = genre?.split(',').map(g => g.trim()).filter(Boolean) || []
  const publicHref = pageEnabled && pageSlug ? `/p/${pageSlug}` : undefined

  const primaryActions: ArtistQuickAction[] = [
    { id: 'song', label: tx.createNewSong.replace(/^\+ /, ''), icon: '+', onClick: onCreateSong, primary: true },
    { id: 'public', label: tx.workspaceActionPublicPage, icon: '🌐', href: publicHref, disabled: !publicHref },
    { id: 'copy', label: tx.mobileCopyShareLink, icon: '⧉', onClick: onCopyPublicLink, disabled: !onCopyPublicLink || !pageSlug },
    { id: 'growth', label: tx.growthHubOpen, icon: '🌱', href: `/growth?artist=${artistId}` },
    { id: 'release', label: tx.workspaceShellCreateReleaseCampaign, icon: '↗', onClick: onCreateReleaseCampaign },
  ]

  return (
    <header className="artist-workspace-hero workspace-glass">
      <div
        className="artist-workspace-hero__cover"
        style={coverUrl ? { backgroundImage: `linear-gradient(180deg, rgba(10,10,15,0.35) 0%, rgba(10,10,15,0.92) 100%), url(${coverUrl})` } : undefined}
      />
      <div className="artist-workspace-hero__inner">
        <div className="artist-workspace-hero__top">
          <Link href="/dashboard" className="artist-workspace-hero__back">← {tx.dashboard}</Link>
          <Link href={`/playbook?artist=${artistId}`} className="artist-workspace-hero__back">🧭 {tx.playbookNavLink}</Link>
        </div>
        <div className="artist-workspace-hero__identity">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="artist-workspace-hero__avatar" />
          ) : (
            <div className="artist-workspace-hero__avatar artist-workspace-hero__avatar--empty">🎤</div>
          )}
          <div className="artist-workspace-hero__meta">
            <h1 className="artist-workspace-hero__name">{name}</h1>
            <div className="artist-workspace-hero__status-row">
              {pageEnabled && pageSlug ? (
                <span className="artist-workspace-hero__status artist-workspace-hero__status--live">{tx.songStudioPublicLive}</span>
              ) : (
                <span className="artist-workspace-hero__status artist-workspace-hero__status--draft">{tx.workspaceActionPublicPage} — {tx.draft}</span>
              )}
            </div>
            {genres.length > 0 && (
              <div className="artist-workspace-hero__genres">
                {genres.slice(0, 4).map(g => (
                  <span key={g} className="artist-workspace-hero__genre-chip">{g}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="artist-workspace-hero__stats">
          {[
            { label: tx.workspaceStatSongs, value: stats.songs },
            { label: tx.workspaceShellFollowers, value: stats.followers },
            { label: tx.growthHubActiveCampaigns, value: stats.campaigns },
            { label: tx.workspaceShellPlaylists, value: stats.playlists },
          ].map(stat => (
            <div key={stat.label} className="artist-workspace-hero__stat">
              <span className="artist-workspace-hero__stat-value">{stat.value}</span>
              <span className="artist-workspace-hero__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
        <ArtistQuickActions actions={primaryActions} />
      </div>
    </header>
  )
}
