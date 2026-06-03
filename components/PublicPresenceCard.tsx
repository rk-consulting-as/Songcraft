'use client'

import Link from 'next/link'
import { clientPublicUrl } from '@/lib/appUrl'
import { t, useLang } from '@/lib/i18n'

type PresenceStatus = 'active' | 'incomplete' | 'disabled'

type Row = {
  key: string
  label: string
  status: PresenceStatus
}

export default function PublicPresenceCard({
  artistId,
  pageSlug,
  pageEnabled,
  epkPublicEnabled,
  epkHasContent,
  featuredReleaseSet,
  newsletterEnabled,
  onManage,
}: {
  artistId: string
  pageSlug?: string | null
  pageEnabled?: boolean
  epkPublicEnabled?: boolean
  epkHasContent?: boolean
  featuredReleaseSet?: boolean
  newsletterEnabled?: boolean
  onManage: () => void
}) {
  const lang = useLang()
  const tx = t[lang]

  const statusLabel = (status: PresenceStatus) => {
    if (status === 'active') return tx.publicPresenceStatusActive
    if (status === 'incomplete') return tx.publicPresenceStatusIncomplete
    return tx.publicPresenceStatusDisabled
  }

  const statusClass = (status: PresenceStatus) =>
    status === 'active' ? 'public-presence-status--active' : status === 'incomplete' ? 'public-presence-status--incomplete' : 'public-presence-status--disabled'

  const publicPageStatus: PresenceStatus = pageEnabled && pageSlug
    ? 'active'
    : pageSlug
      ? 'incomplete'
      : 'disabled'

  const epkStatus: PresenceStatus = epkPublicEnabled
    ? 'active'
    : epkHasContent
      ? 'incomplete'
      : 'disabled'

  const featuredStatus: PresenceStatus = featuredReleaseSet
    ? 'active'
    : pageEnabled
      ? 'incomplete'
      : 'disabled'

  const newsletterStatus: PresenceStatus = newsletterEnabled && pageEnabled
    ? 'active'
    : pageEnabled
      ? 'incomplete'
      : 'disabled'

  const rows: Row[] = [
    { key: 'page', label: tx.publicPresencePublicPage, status: publicPageStatus },
    { key: 'epk', label: tx.publicPresenceEpk, status: epkStatus },
    { key: 'featured', label: tx.publicPresenceFeaturedRelease, status: featuredStatus },
    { key: 'newsletter', label: tx.publicPresenceNewsletter, status: newsletterStatus },
    { key: 'domain', label: tx.publicPresenceCustomDomain, status: 'disabled' },
  ]

  const publicUrl = pageSlug ? clientPublicUrl(`/p/${pageSlug}`) : ''
  const epkUrl = pageSlug && epkPublicEnabled ? clientPublicUrl(`/epk/${pageSlug}`) : ''

  return (
    <div className="card workspace-card public-presence-card">
      <h3 className="workspace-card-title">{tx.publicPresenceTitle}</h3>
      <p className="public-presence-desc">{tx.publicPresenceDesc}</p>

      <ul className="public-presence-list">
        {rows.map(row => (
          <li key={row.key} className="public-presence-row">
            <span className="public-presence-row-label">{row.label}</span>
            <span className={`public-presence-status ${statusClass(row.status)}`}>
              {row.key === 'domain' ? tx.publicPresenceCustomDomainFuture : statusLabel(row.status)}
            </span>
          </li>
        ))}
      </ul>

      <div className="workspace-action-grid public-presence-actions">
        {publicUrl && pageEnabled && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-outline quick-action-btn">
            {tx.publicPresenceOpenPublicPage} ↗
          </a>
        )}
        {epkUrl && (
          <a href={epkUrl} target="_blank" rel="noopener noreferrer" className="btn-outline quick-action-btn">
            {tx.publicPresenceOpenEpk} ↗
          </a>
        )}
        <button type="button" className="btn-gold quick-action-btn" onClick={onManage}>
          {tx.publicPresenceManage}
        </button>
        <Link href={`/playbook?artist=${artistId}`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
          {tx.continueGrowthJourney} →
        </Link>
      </div>
    </div>
  )
}
