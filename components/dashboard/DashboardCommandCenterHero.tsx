'use client'

import Link from 'next/link'
import type { CommandCenterSnapshot } from '@/lib/dashboard/types'
import { getDashboardGreeting } from '@/lib/dashboard/buildCommandCenter'

type Props = {
  snapshot: CommandCenterSnapshot
  displayName?: string | null
  tx: Record<string, string>
}

export default function DashboardCommandCenterHero({ snapshot, displayName, tx }: Props) {
  const greeting = getDashboardGreeting(tx, displayName)

  return (
    <section className="dashboard-cmd-hero card workspace-card workspace-glass">
      <div className="dashboard-cmd-hero__top">
        <div>
          <p className="dashboard-cmd-hero__greeting">{greeting}</p>
          <h2 className="dashboard-cmd-hero__title">{tx.cmdHeroTitle}</h2>
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

      {snapshot.actions.length > 0 ? (
        <ul className="dashboard-cmd-hero__actions">
          {snapshot.actions.map(action => (
            <li key={action.id}>
              <Link href={action.href} className="dashboard-cmd-hero__action-link">
                <span className="dashboard-cmd-hero__action-check" aria-hidden="true">✓</span>
                <span>{action.label}</span>
                <span className="dashboard-cmd-hero__action-arrow">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dashboard-cmd-hero__empty">{tx.cmdNoActions}</p>
      )}
    </section>
  )
}
