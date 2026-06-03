import type { ReactNode } from 'react'

type Props = {
  icon?: string
  title: string
  description?: string
  accent?: string
  action?: ReactNode
}

export default function PublicEmptyState({ icon = '♪', title, description, accent, action }: Props) {
  return (
    <div
      className="empty-state public-empty"
      role="status"
      style={accent ? ({ ['--pub-accent' as string]: accent } as React.CSSProperties) : undefined}
    >
      <span className="empty-state-icon public-empty__icon" aria-hidden>{icon}</span>
      <p className="empty-state-title public-empty__title">{title}</p>
      {description && <p className="empty-state-desc public-empty__desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  )
}
