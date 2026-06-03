'use client'

import Link from 'next/link'
import type { DiscoverOpportunity } from '@/lib/dashboard/discoverOpportunities'

type Props = {
  opportunities: DiscoverOpportunity[]
  tx: Record<string, string>
}

const kindIcon: Record<DiscoverOpportunity['kind'], string> = {
  campaign: '🎧',
  artist: '🎤',
  collaboration: '🤝',
}

export default function DashboardDiscoverOpportunities({ opportunities, tx }: Props) {
  if (opportunities.length === 0) return null

  return (
    <section className="dashboard-section dashboard-discover-opps">
      <h2 className="dashboard-section__title">{tx.adaptDiscoverTitle}</h2>
      <ul className="dashboard-discover-opps__list">
        {opportunities.map(opp => (
          <li key={opp.id}>
            <Link href={opp.href} className="dashboard-discover-opp card workspace-card workspace-glass">
              <span className="dashboard-discover-opp__icon" aria-hidden="true">{kindIcon[opp.kind]}</span>
              <div>
                <h3 className="dashboard-discover-opp__title">{opp.title}</h3>
                <p className="dashboard-discover-opp__desc">{opp.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
