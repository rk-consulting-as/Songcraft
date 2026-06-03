'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { clientPublicUrl } from '@/lib/appUrl'
import { epkPreviewPath, epkPublicPath } from '@/lib/epk/paths'
import { t, useLang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'
import type { BrandPanel } from '@/lib/artistWorkspaceTabs'
import PublicSocialPreviewCard from './PublicSocialPreviewCard'
import PublicSitePreviewFrame from './PublicSitePreviewFrame'

type PresenceStatus = 'active' | 'incomplete' | 'disabled'

type Props = {
  artistId: string
  artistName: string
  pageEnabled?: boolean
  pageSlug?: string | null
  pageTemplate?: string | null
  epkPublicEnabled?: boolean
  epkHasContent?: boolean
  featuredReleaseSet?: boolean
  newsletterEnabled?: boolean
  previewTitle: string
  previewDescription: string
  previewImage?: string | null
  onOpenPanel: (panel: BrandPanel) => void
}

const TEMPLATE_KEYS = [
  { id: 'default', labelKey: 'publicBuilderThemeDefault', descKey: 'publicBuilderThemeDefaultDesc' },
  { id: 'cinematic', labelKey: 'publicBuilderThemeCinematic', descKey: 'publicBuilderThemeCinematicDesc' },
  { id: 'minimal', labelKey: 'publicBuilderThemeMinimal', descKey: 'publicBuilderThemeMinimalDesc' },
] as const

export default function PublicPresenceBuilder({
  artistId,
  artistName,
  pageEnabled,
  pageSlug,
  pageTemplate = 'default',
  epkPublicEnabled,
  epkHasContent,
  featuredReleaseSet,
  newsletterEnabled,
  previewTitle,
  previewDescription,
  previewImage,
  onOpenPanel,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [copied, setCopied] = useState<'public' | 'epk' | null>(null)
  const [publishedStoriesCount, setPublishedStoriesCount] = useState(0)

  useEffect(() => {
    createClient()
      .from('artist_stories')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .eq('status', 'published')
      .then(({ count }) => setPublishedStoriesCount(count || 0))
  }, [artistId])

  const statusLabel = (status: PresenceStatus) => {
    if (status === 'active') return tx.publicPresenceStatusActive
    if (status === 'incomplete') return tx.publicPresenceStatusIncomplete
    return tx.publicPresenceStatusDisabled
  }

  const publicPageStatus: PresenceStatus = pageEnabled && pageSlug ? 'active' : pageSlug ? 'incomplete' : 'disabled'
  const epkStatus: PresenceStatus = epkPublicEnabled ? 'active' : epkHasContent ? 'incomplete' : 'disabled'
  const featuredStatus: PresenceStatus = featuredReleaseSet ? 'active' : pageEnabled ? 'incomplete' : 'disabled'
  const newsletterStatus: PresenceStatus = newsletterEnabled && pageEnabled ? 'active' : pageEnabled ? 'incomplete' : 'disabled'
  const storiesStatus: PresenceStatus = !pageEnabled ? 'disabled' : publishedStoriesCount > 0 ? 'active' : 'incomplete'

  const publicUrl = pageSlug ? clientPublicUrl(`/p/${pageSlug}`) : ''
  const epkPublicUrl = pageSlug && epkPublicEnabled ? clientPublicUrl(epkPublicPath(pageSlug) || '') : ''
  const epkPreviewUrl = pageSlug ? clientPublicUrl(epkPreviewPath(pageSlug) || '') : ''

  const logEpkPreviewClick = () => {
    if (epkPreviewUrl) console.info('[ViaTone] EPK preview URL:', epkPreviewUrl)
  }

  const copyUrl = async (url: string, kind: 'public' | 'epk') => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch { /* ignore */ }
  }

  const rows: { key: string; label: string; status: PresenceStatus; panel: BrandPanel }[] = [
    { key: 'public', label: tx.publicPresencePublicPage, status: publicPageStatus, panel: 'sharing' },
    { key: 'epk', label: tx.publicPresenceEpk, status: epkStatus, panel: 'epk' },
    { key: 'featured', label: tx.publicPresenceFeaturedRelease, status: featuredStatus, panel: 'sharing' },
    { key: 'stories', label: tx.publicPresenceStories, status: storiesStatus, panel: 'stories' },
    { key: 'newsletter', label: tx.publicPresenceNewsletter, status: newsletterStatus, panel: 'fanhub' },
    { key: 'fanhub', label: tx.workspaceTabFanHub, status: (pageEnabled ? 'active' : 'disabled') as PresenceStatus, panel: 'fanhub' },
    { key: 'events', label: tx.eventsTitle, status: (pageEnabled ? 'active' : 'disabled') as PresenceStatus, panel: 'events' },
  ]

  return (
    <div className="workspace-section public-presence-builder">
      <div className="card workspace-card workspace-glass public-presence-builder__header">
        <h2 className="workspace-section-title">{tx.publicBuilderTitle}</h2>
        <p className="workspace-section-desc">{tx.publicBuilderDesc}</p>

        <div className="public-presence-builder__actions">
          {publicUrl && pageEnabled && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
              {tx.publicBuilderPreviewSite} ↗
            </a>
          )}
          {epkPreviewUrl && (
            <a
              href={epkPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={logEpkPreviewClick}
              className="btn-outline quick-action-btn"
              style={{ textDecoration: 'none' }}
            >
              {tx.publicBuilderPreviewEpk} ↗
            </a>
          )}
          {publicUrl && (
            <button type="button" className="btn-outline quick-action-btn" onClick={() => copyUrl(publicUrl, 'public')}>
              {copied === 'public' ? tx.copied : tx.publicBuilderCopyPublicUrl}
            </button>
          )}
          {epkPublicUrl && (
            <button type="button" className="btn-outline quick-action-btn" onClick={() => copyUrl(epkPublicUrl, 'epk')}>
              {copied === 'epk' ? tx.copied : tx.publicBuilderCopyEpkUrl}
            </button>
          )}
        </div>
      </div>

      {pageSlug && pageEnabled && (
        <PublicSitePreviewFrame slug={pageSlug} publicUrl={publicUrl} />
      )}

      <PublicSocialPreviewCard
        title={previewTitle}
        description={previewDescription}
        imageUrl={previewImage}
        shareUrl={publicUrl}
      />

      <div className="card workspace-card workspace-glass">
        <h3 className="workspace-card-title">{tx.publicBuilderManageSections}</h3>
        <ul className="public-presence-list public-presence-builder__rows">
          {rows.map(row => (
            <li key={row.key} className="public-presence-row public-presence-builder__row">
              <button type="button" className="public-presence-builder__row-btn" onClick={() => onOpenPanel(row.panel)}>
                <span className="public-presence-row-label">{row.label}</span>
                <span className={`public-presence-status public-presence-status--${row.status}`}>{statusLabel(row.status)}</span>
                <span className="public-presence-builder__row-arrow">→</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card workspace-card workspace-glass">
        <h3 className="workspace-card-title">{tx.publicBuilderThemes}</h3>
        <p className="workspace-section-desc">{tx.publicBuilderThemesDesc}</p>
        <div className="public-theme-grid">
          {TEMPLATE_KEYS.map(theme => {
            const active = (pageTemplate || 'default') === theme.id
            return (
              <div key={theme.id} className={`public-theme-card${active ? ' is-active' : ''}`}>
                <span className="public-theme-card__name">{tx[theme.labelKey]}</span>
                <span className="public-theme-card__desc">{tx[theme.descKey]}</span>
                {active && <span className="public-theme-card__badge">{tx.publicBuilderThemeActive}</span>}
              </div>
            )
          })}
        </div>
        <button type="button" className="btn-outline quick-action-btn" style={{ marginTop: 12 }} onClick={() => onOpenPanel('theme')}>
          {tx.publicBuilderEditInPublicPanel}
        </button>
      </div>

      <div className="card workspace-card workspace-glass public-domain-placeholder">
        <h3 className="workspace-card-title">{tx.publicBuilderCustomDomain}</h3>
        <p className="workspace-section-desc">{tx.publicBuilderCustomDomainDesc}</p>
        <div className="public-domain-placeholder__setup">
          <p className="public-domain-placeholder__label">{tx.publicBuilderCustomDomainRecommended}</p>
          <code className="public-domain-placeholder__code">artistdomain.com → ViaTone artist site</code>
        </div>
        <p className="public-domain-placeholder__future">{tx.publicBuilderCustomDomainFuture}</p>
        <span className="public-presence-status public-presence-status--disabled">{tx.publicPresenceCustomDomainFuture}</span>
      </div>

      <Link href={`/playbook?artist=${artistId}`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center', alignSelf: 'flex-start' }}>
        {tx.continueGrowthJourney} →
      </Link>
    </div>
  )
}
