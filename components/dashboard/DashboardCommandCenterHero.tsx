'use client'

import Link from 'next/link'
import type { CommandCenterSnapshot } from '@/lib/dashboard/types'

type Props = {
  snapshot: CommandCenterSnapshot
  displayName?: string | null
  tx: Record<string, string>
  onCreateArtist?: () => void
}

export default function DashboardCommandCenterHero({ snapshot, tx, onCreateArtist }: Props) {
  const hero = snapshot.hero
  const stageBadge = hero?.stage ? tx[`adaptStage_${hero.stage}` as keyof typeof tx] || hero.stage : null

  return (
    <section className={`dashboard-cmd-hero card workspace-card workspace-glass dashboard-cmd-hero--${hero?.stage || 'starter'}`}>
      <div className="dashboard-cmd-hero__top">
        <div>
          {stageBadge && (
            <span className="dashboard-cmd-hero__stage-badge">{stageBadge}</span>
          )}
          <h2 className="dashboard-cmd-hero__title">{hero?.headline || tx.cmdHeroTitle}</h2>
          {hero?.subline && (
            <p className="dashboard-cmd-hero__subline">{hero.subline}</p>
          )}
          {hero?.focusLine && (
            <p className="dashboard-cmd-hero__focus">{hero.focusLine}</p>
          )}
        </div>
        <div className="dashboard-cmd-hero__score" aria-label={tx.cmdGrowthScoreLabel}>
          <span className="dashboard-cmd-hero__score-value">{snapshot.growthScore}%</span>
          <span className="dashboard-cmd-hero__score-label">{tx.cmdGrowthScoreLabel}</span>
        </div>
      </div>

      <ul className="dashboard-cmd-hero__summary">
        <li><strong>{snapshot.actionCount}</strong> {tx.cmdSummaryActions}</li>
        <li><strong>{snapshot.releasesInProgress}</strong> {tx.cmdSummaryReleases}</li>
        <li><strong>{snapshot.communityItems}</strong> {tx.cmdSummaryCommunity}</li>
      </ul>

      {hero?.nextStepLabel && (
        <div className="dashboard-cmd-hero__next">
          <span className="dashboard-cmd-hero__next-label">{tx.adaptHeroNextStep}</span>
          {hero.nextStepHref ? (
            <Link href={hero.nextStepHref} className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
              {hero.nextStepLabel} →
            </Link>
          ) : onCreateArtist ? (
            <button type="button" className="btn-gold quick-action-btn" onClick={onCreateArtist}>
              {hero.nextStepLabel} →
            </button>
          ) : (
            <span className="dashboard-cmd-hero__next-text">{hero.nextStepLabel}</span>
          )}
        </div>
      )}
    </section>
  )
}
