'use client'

import Link from 'next/link'
import type { ActiveReleaseItem } from '@/lib/dashboard/types'

type Props = {
  releases: ActiveReleaseItem[]
  tx: Record<string, string>
}

export default function DashboardActiveReleases({ releases, tx }: Props) {
  if (releases.length === 0) return null

  return (
    <section id="songs" className="dashboard-section dashboard-active-releases">
      <h2 className="dashboard-section__title">{tx.cmdActiveReleases}</h2>
      <ul className="dashboard-active-releases__list">
        {releases.map(release => (
          <li key={release.id} className="dashboard-release-card card workspace-card">
            <Link href={release.href} className="dashboard-release-card__link">
              {release.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={release.cover_url} alt="" className="dashboard-release-card__cover" />
              ) : (
                <div className="dashboard-release-card__cover dashboard-release-card__cover--empty" aria-hidden="true">♪</div>
              )}
              <div className="dashboard-release-card__body">
                <h3 className="dashboard-release-card__title">{release.title}</h3>
                <p className="dashboard-release-card__artist">{release.artist_name}</p>
                <div className="dashboard-release-card__progress" aria-label={`${release.completion}%`}>
                  <div className="dashboard-release-card__progress-fill" style={{ width: `${release.completion}%` }} />
                </div>
                <p className="dashboard-release-card__pct">{release.completion}% {tx.cmdComplete}</p>
              </div>
              <span className="btn-gold quick-action-btn dashboard-release-card__cta" style={{ textDecoration: 'none' }}>
                {tx.cmdContinueRelease}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
