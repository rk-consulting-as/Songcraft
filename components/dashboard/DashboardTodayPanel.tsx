'use client'

import Link from 'next/link'
import type { TodayAction } from '@/lib/dashboard/todayActions'

type Props = {
  actions: TodayAction[]
  tx: Record<string, string>
}

export default function DashboardTodayPanel({ actions, tx }: Props) {
  if (actions.length === 0) return null

  return (
    <section className="dashboard-section dashboard-today-panel">
      <h2 className="dashboard-section__title">{tx.adaptTodayTitle}</h2>
      <ul className="dashboard-today__list">
        {actions.map(action => (
          <li key={action.id}>
            <Link href={action.href} className="dashboard-today__item card workspace-card">
              <span className={`dashboard-today__tier dashboard-today__tier--${action.tier}`}>
                {action.tierLabel}
              </span>
              <span className="dashboard-today__label">{action.label}</span>
              <span className="dashboard-today__arrow" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
