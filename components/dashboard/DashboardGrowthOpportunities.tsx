'use client'

import Link from 'next/link'
import type { GrowthOpportunityItem } from '@/lib/dashboard/types'

type Props = {
  opportunities: GrowthOpportunityItem[]
  tx: Record<string, string>
}

const IMPACT_KEYS = {
  low: 'cmdImpactLow',
  medium: 'cmdImpactMedium',
  high: 'cmdImpactHigh',
} as const

export default function DashboardGrowthOpportunities({ opportunities, tx }: Props) {
  if (opportunities.length === 0) return null

  return (
    <section className="dashboard-section dashboard-growth-opps">
      <h2 className="dashboard-section__title">{tx.cmdGrowthOpportunities}</h2>
      <ul className="dashboard-growth-opps__list">
        {opportunities.map(item => (
          <li key={item.id}>
            <Link href={item.href} className="dashboard-growth-opp card workspace-card">
              <div className="dashboard-growth-opp__head">
                <h3 className="dashboard-growth-opp__title">{item.title}</h3>
                <span className={`dashboard-growth-opp__impact dashboard-growth-opp__impact--${item.impact}`}>
                  {tx[IMPACT_KEYS[item.impact]]}
                </span>
              </div>
              {item.description && <p className="dashboard-growth-opp__desc">{item.description}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
