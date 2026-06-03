'use client'

import Link from 'next/link'
import type { CommandCenterSnapshot, DashboardInsightsData } from '@/lib/dashboard/types'

type Props = {
  insights: DashboardInsightsData
  snapshot: CommandCenterSnapshot
  tx: Record<string, string>
}

export default function DashboardInsights({ insights, snapshot, tx }: Props) {
  const smart = snapshot.smartInsights || []
  const hasSmart = smart.length > 0

  return (
    <section className="dashboard-section dashboard-insights">
      <h2 className="dashboard-section__title">{tx.cmdInsightsTitle}</h2>
      <div className="dashboard-insights__counts">
        <div className="dashboard-insight-mini card workspace-card">
          <span className="dashboard-insight-mini__value">{insights.artistCount}</span>
          <span className="dashboard-insight-mini__label">{tx.artists}</span>
        </div>
        <div className="dashboard-insight-mini card workspace-card">
          <span className="dashboard-insight-mini__value">{insights.songCount}</span>
          <span className="dashboard-insight-mini__label">{tx.totalSongs}</span>
        </div>
        <div className="dashboard-insight-mini card workspace-card">
          <span className="dashboard-insight-mini__value">{insights.projectCount}</span>
          <span className="dashboard-insight-mini__label">{tx.activeProjects}</span>
        </div>
      </div>

      {hasSmart ? (
        <div className="dashboard-insights__grid">
          {smart.map(card => {
            const inner = (
              <>
                <span className="dashboard-insight-card__label">{card.label}</span>
                <span className="dashboard-insight-card__value">{card.value}</span>
                {card.meta && <span className="dashboard-insight-card__meta">{card.meta}</span>}
              </>
            )
            return card.href ? (
              <Link key={card.id} href={card.href} className="dashboard-insight-card card workspace-card">
                {inner}
              </Link>
            ) : (
              <div key={card.id} className="dashboard-insight-card card workspace-card">
                {inner}
              </div>
            )
          })}
        </div>
      ) : null}

      <Link href="/analytics" className="dashboard-insights__analytics-link">{tx.analyticsLabelAccount} →</Link>
    </section>
  )
}
