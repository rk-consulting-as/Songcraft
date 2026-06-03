'use client'

import { useState } from 'react'
import QRCodeCard from '@/components/QRCodeCard'
import ArtistFeaturedReleasePicker from '@/components/ArtistFeaturedReleasePicker'
import UpgradePrompt from '@/components/UpgradePrompt'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import { clientPublicUrl } from '@/lib/appUrl'
import { t, useLang } from '@/lib/i18n'
import type { CreatorPageSettings } from '@/lib/creatorIdentity/types'
import type { PlanId } from '@/lib/subscription'

type Props = {
  artistId: string
  artistName: string
  pageEnabled?: boolean
  pageSlug?: string | null
  pageSettings?: CreatorPageSettings | null
  songs: { id: string; title: string; public_hidden?: boolean | null }[]
  albums: { id: string; title: string }[]
  planId: PlanId
  onSavedSettings: (settings: CreatorPageSettings) => void
}

export default function ArtistSiteSharingPanel({
  artistId,
  artistName,
  pageEnabled,
  pageSlug,
  pageSettings,
  songs,
  albums,
  planId,
  onSavedSettings,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [copied, setCopied] = useState(false)

  if (!pageEnabled || !pageSlug) {
    return (
      <WorkspaceEmptyState
        icon="🌐"
        title={tx.publicPageSlugRequired}
        description={tx.artistSiteSharingDisabledDesc}
      />
    )
  }

  const publicUrl = clientPublicUrl(`/p/${pageSlug}`)
  const storiesUrl = clientPublicUrl(`/p/${pageSlug}/stories`)

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="workspace-section artist-site-sharing">
      <div className="card workspace-card workspace-glass">
        <h2 className="workspace-section-title">{tx.artistSiteSharingTitle}</h2>
        <p className="workspace-section-desc">{tx.artistSiteSharingDesc}</p>
        <p style={{ color: '#8a7a60', fontSize: 13, wordBreak: 'break-all' }}>{publicUrl}</p>
        <div className="artist-site-sharing__actions">
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
            {tx.publicBuilderPreviewSite} ↗
          </a>
          <button type="button" className="btn-outline quick-action-btn" onClick={() => copy(publicUrl)}>
            {copied ? tx.copied : tx.publicBuilderCopyPublicUrl}
          </button>
          <button type="button" className="btn-outline quick-action-btn" onClick={() => copy(storiesUrl)}>
            {tx.storyCopyStoriesIndexUrl}
          </button>
        </div>
      </div>

      <QRCodeCard path={`/p/${pageSlug}`} title={tx.qrArtistHint} artistId={artistId} saveLabel={artistName} />
      {planId === 'free' && (
        <UpgradePrompt compact title={tx.upgradeQrTitle} description={tx.upgradeQrDesc} />
      )}

      <ArtistFeaturedReleasePicker
        artistId={artistId}
        pageSettings={pageSettings}
        songs={songs}
        albums={albums}
        onSaved={onSavedSettings}
      />
    </div>
  )
}
