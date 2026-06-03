'use client'

import Link from 'next/link'
import type { QuickWinItem } from '@/lib/dashboard/quickWins'

type Props = {
  wins: QuickWinItem[]
  tx: Record<string, string>
}

export default function DashboardQuickWins({ wins, tx }: Props) {
  if (wins.length === 0) return null

  return (
    <section className="dashboard-section dashboard-quick-wins">
      <h2 className="dashboard-section__title">{tx.adaptQuickWinsTitle}</h2>
      <ul className="dashboard-quick-wins__list">
        {wins.map(win => (
          <li key={win.id}>
            <Link href={win.href} className="dashboard-quick-wins__item">
              <span className="dashboard-quick-wins__check" aria-hidden="true">○</span>
              <span>{win.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
