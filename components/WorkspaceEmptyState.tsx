'use client'

import type { ReactNode } from 'react'

export default function WorkspaceEmptyState({
  icon = '○',
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state workspace-empty" role="status">
      <span className="empty-state-icon workspace-empty-icon" aria-hidden>{icon}</span>
      <p className="empty-state-title workspace-empty-title">{title}</p>
      {description && <p className="empty-state-desc workspace-empty-desc">{description}</p>}
      {action && <div className="empty-state-action workspace-empty-action">{action}</div>}
    </div>
  )
}
