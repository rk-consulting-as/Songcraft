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
    <div className="workspace-empty" role="status">
      <span className="workspace-empty-icon" aria-hidden>{icon}</span>
      <p className="workspace-empty-title">{title}</p>
      {description && <p className="workspace-empty-desc">{description}</p>}
      {action && <div className="workspace-empty-action">{action}</div>}
    </div>
  )
}
