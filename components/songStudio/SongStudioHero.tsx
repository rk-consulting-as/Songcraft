'use client'

import Link from 'next/link'
import { t, useLang } from '@/lib/i18n'
import SongQuickActions, { type SongQuickAction } from './SongQuickActions'

type Props = {
  artistId?: string
  artistName?: string
  title: string
  onTitleChange: (value: string) => void
  coverUrl?: string | null
  status?: string
  statusLabel?: string
  publicPageAvailable?: boolean
  publicPageHidden?: boolean
  hasSpotifyLink?: boolean
  hasMediaLinks?: boolean
  readinessScore?: number
  onCopySunoPrompt?: () => void
  onOpenSuno?: () => void
  onViewPublicSong?: () => void
  onSetFeaturedRelease?: () => void
  onOpenReleaseCampaign?: () => void
  featuredReleaseSet?: boolean
  featuredReleaseSaving?: boolean
  sunoCopied?: boolean
}

export default function SongStudioHero({
  artistId,
  artistName,
  title,
  onTitleChange,
  coverUrl,
  status,
  statusLabel,
  publicPageAvailable,
  publicPageHidden,
  hasSpotifyLink,
  hasMediaLinks,
  readinessScore,
  onCopySunoPrompt,
  onOpenSuno,
  onViewPublicSong,
  onSetFeaturedRelease,
  onOpenReleaseCampaign,
  featuredReleaseSet,
  featuredReleaseSaving,
  sunoCopied,
}: Props) {
  const tx = t[useLang()] as Record<string, string>

  const actions: SongQuickAction[] = [
    {
      id: 'copy-suno',
      label: sunoCopied ? tx.copied : tx.songStudioCopySunoPrompt,
      onClick: onCopySunoPrompt,
      disabled: !onCopySunoPrompt,
      ariaLabel: tx.songStudioCopySunoPrompt,
    },
    {
      id: 'open-suno',
      label: tx.songStudioOpenSuno,
      onClick: onOpenSuno,
      disabled: !onOpenSuno,
      primary: true,
      ariaLabel: tx.songStudioOpenSuno,
    },
    {
      id: 'public',
      label: tx.songStudioViewPublicSong,
      onClick: onViewPublicSong,
      disabled: !publicPageAvailable || publicPageHidden,
      ariaLabel: tx.songStudioViewPublicSong,
    },
    {
      id: 'featured',
      label: featuredReleaseSaving
        ? tx.saving
        : featuredReleaseSet
          ? tx.songStudioFeaturedSet
          : tx.songStudioSetFeatured,
      onClick: onSetFeaturedRelease,
      disabled: !onSetFeaturedRelease || featuredReleaseSaving,
      ariaLabel: tx.songStudioSetFeatured,
    },
    {
      id: 'release',
      label: tx.songStudioOpenReleaseCampaign,
      onClick: onOpenReleaseCampaign,
      ariaLabel: tx.songStudioOpenReleaseCampaign,
    },
  ]

  const chips = [
    statusLabel && { label: statusLabel, tone: status === 'complete' ? 'ready' : 'default' },
    featuredReleaseSet && { label: tx.songStudioFeaturedSet, tone: 'ready' },
    publicPageAvailable && !publicPageHidden && { label: tx.songStudioPublicLive, tone: 'ready' },
    publicPageHidden && { label: tx.songStudioPublicHidden, tone: 'muted' },
    hasSpotifyLink && { label: 'Spotify', tone: 'spotify' },
    hasMediaLinks && { label: tx.media, tone: 'default' },
  ].filter(Boolean) as { label: string; tone: string }[]

  return (
    <header className="song-studio-hero workspace-glass">
      <div className="song-studio-hero__inner">
        <div className="song-studio-hero__top">
          {artistId && artistName && (
            <Link href={`/artist/${artistId}`} className="song-studio-hero__back">← {artistName}</Link>
          )}
        </div>
        <div className="song-studio-hero__main-row">
          <div className="song-studio-hero__identity">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="song-studio-hero__cover" />
            ) : (
              <div className="song-studio-hero__cover song-studio-hero__cover--empty" aria-hidden="true">🎵</div>
            )}
            <div className="song-studio-hero__meta">
              <label className="song-studio-hero__title-label">{tx.songCanonicalTitleLabel}</label>
              <input
                value={title}
                onChange={e => onTitleChange(e.target.value)}
                className="song-studio-hero__title-input"
                aria-label={tx.songCanonicalTitleLabel}
              />
              <p className="song-studio-hero__title-hint">{tx.songCanonicalTitleHint}</p>
              {chips.length > 0 && (
                <div className="song-studio-hero__chips" aria-label={tx.songStudioStatusSummary}>
                  {chips.map(chip => (
                    <span key={chip.label} className={`song-studio-hero__chip song-studio-hero__chip--${chip.tone}`}>{chip.label}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {typeof readinessScore === 'number' && (
            <div className="song-studio-hero__dock">
              <div className="song-studio-hero__readiness" aria-label={`${tx.reviewScore}: ${readinessScore}`}>
                <span className="song-studio-hero__readiness-value">{readinessScore}</span>
                <span className="song-studio-hero__readiness-label">{tx.reviewScore}</span>
              </div>
            </div>
          )}
        </div>
        <SongQuickActions actions={actions} />
      </div>
    </header>
  )
}
