'use client'

import Link from 'next/link'
import V2EmptyState from '@/components/v2/V2EmptyState'
import type { V2CommunityReminder } from '@/lib/v2/types'

type Props = {
  reminders: V2CommunityReminder[]
  title?: string
  emptyHint?: string
  emptyCtaLabel?: string
  emptyCtaHref?: string
}

export default function V2CommunityNextActions({
  reminders,
  title = 'Next actions',
  emptyHint = 'No new community alerts right now. Join a session or leave feedback to keep momentum going.',
  emptyCtaLabel,
  emptyCtaHref,
}: Props) {
  return (
    <div className="v2-card v2-next-actions">
      <h4 style={{ margin: '0 0 12px' }}>{title}</h4>
      {reminders.length === 0 ? (
        <V2EmptyState
          icon="✓"
          title="You’re all caught up"
          description={emptyHint}
          actionLabel={emptyCtaLabel}
          actionHref={emptyCtaHref}
        />
      ) : (
        <ul className="v2-next-actions__list">
          {reminders.map(r => (
            <li key={r.id} className={`v2-next-action tone-${r.tone}`}>
              <span className="v2-next-action__icon" aria-hidden>{r.icon}</span>
              <div className="v2-next-action__body">
                <p className="v2-next-action__title">{r.title}</p>
                {r.body && <p className="v2-meta v2-next-action__text">{r.body}</p>}
              </div>
              <Link href={r.cta.href} className="v2-btn hot sm v2-next-action__cta">{r.cta.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
