'use client'

import { useState } from 'react'
import Link from 'next/link'
import { clientPublicUrl } from '@/lib/appUrl'
import { t, useLang } from '@/lib/i18n'
import PublicPresenceCard from '@/components/PublicPresenceCard'

type Song = { id: string; title: string; status: string; created_at: string }
type Artist = {
  id: string
  name: string
  genre?: string | null
  page_enabled?: boolean
  page_slug?: string | null
  spotify_id?: string | null
}

export default function ArtistWorkspaceOverview({
  artist,
  songs,
  subscriberCount,
  publicPageViews,
  newsletterSignups,
  epkPublicEnabled,
  epkHasContent,
  featuredReleaseSet,
  newsletterEnabled,
  onOpenTab,
}: {
  artist: Artist
  songs: Song[]
  subscriberCount: number
  publicPageViews: number
  newsletterSignups: number
  epkPublicEnabled?: boolean
  epkHasContent?: boolean
  featuredReleaseSet?: boolean
  newsletterEnabled?: boolean
  onOpenTab: (tab: string) => void
}) {
  const lang = useLang()
  const tx = t[lang]
  const [urlCopied, setUrlCopied] = useState(false)
  const released = songs.filter(s => s.status === 'released').length
  const recent = songs.slice(0, 5)
  const publicUrl = artist.page_slug ? clientPublicUrl(`/p/${artist.page_slug}`) : ''
  const canOpenPublic = !!(artist.page_enabled && artist.page_slug)

  const copyPublicUrl = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setUrlCopied(true)
      window.setTimeout(() => setUrlCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const stats = [
    { label: tx.workspaceStatSongs, value: songs.length, tab: 'songs' },
    { label: tx.workspaceStatReleased, value: released, tab: 'songs' },
    { label: tx.workspaceStatSubscribers, value: subscriberCount, tab: 'fanhub' },
    { label: tx.workspaceStatPageViews, value: publicPageViews, tab: 'analytics' },
    { label: tx.workspaceStatSignups, value: newsletterSignups, tab: 'fanhub' },
  ]

  return (
    <div className="workspace-section">
      <div className="workspace-stat-grid">
        {stats.map(stat => (
          <button
            key={stat.label}
            type="button"
            className="workspace-stat-card"
            onClick={() => onOpenTab(stat.tab)}
          >
            <span className="workspace-stat-label">{stat.label}</span>
            <span className="workspace-stat-value">{stat.value}</span>
          </button>
        ))}
      </div>

      <div className="workspace-overview__presence-row workspace-two-column workspace-two-column--balanced">
        <PublicPresenceCard
          artistId={artist.id}
          pageSlug={artist.page_slug}
          pageEnabled={artist.page_enabled}
          epkPublicEnabled={epkPublicEnabled}
          epkHasContent={epkHasContent}
          featuredReleaseSet={featuredReleaseSet}
          newsletterEnabled={newsletterEnabled}
          onManage={() => onOpenTab('public')}
        />

        <div className="workspace-two-col">
        <div className="card workspace-card">
          <h3 className="workspace-card-title">{tx.workspaceQuickActions}</h3>
          <div className="workspace-action-grid">
            <button type="button" className="btn-gold quick-action-btn" onClick={() => onOpenTab('songs')}>
              + {tx.createNewSong.replace(/^\+ /, '')}
            </button>
            {artist.spotify_id && (
              <button type="button" className="btn-outline quick-action-btn" onClick={() => onOpenTab('songs')}>
                {tx.importFromSpotify}
              </button>
            )}
            {canOpenPublic && (
              <a
                href={`/p/${artist.page_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline quick-action-btn"
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                {tx.workspaceActionPublicPage} ↗
              </a>
            )}
            {publicUrl && (
              <button type="button" className="btn-outline quick-action-btn" onClick={copyPublicUrl}>
                {urlCopied ? tx.copied : tx.workspaceCopyPublicUrl}
              </button>
            )}
            <button type="button" className="btn-outline quick-action-btn" onClick={() => onOpenTab('epk')}>
              {tx.workspaceActionEpk}
            </button>
            <button type="button" className="btn-outline quick-action-btn" onClick={() => onOpenTab('analytics')}>
              {tx.analyticsLabelArtistInsights}
            </button>
            <Link href="/playbook" className="btn-gold quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              🧭 {tx.continueGrowthJourney}
            </Link>
          </div>
        </div>

        <div className="card workspace-card">
          <h3 className="workspace-card-title">{tx.workspaceRecentSongs}</h3>
          {recent.length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13, margin: 0 }}>{tx.noSongs}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(song => (
                <Link
                  key={song.id}
                  href={`/song/${song.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(180,140,80,0.14)',
                    background: 'rgba(255,255,255,0.02)',
                    textDecoration: 'none',
                    color: '#e8e0d0',
                    fontSize: 13,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                  <span style={{ color: '#8a7a60', fontSize: 11, textTransform: 'capitalize', flexShrink: 0 }}>{song.status}</span>
                </Link>
              ))}
            </div>
          )}
          {publicUrl && (
            <p style={{ color: '#6a5a40', fontSize: 12, margin: '14px 0 0', wordBreak: 'break-all' }}>
              {publicUrl}
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
