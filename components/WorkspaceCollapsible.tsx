'use client'

import { useState, type ReactNode } from 'react'

export default function WorkspaceCollapsible({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`workspace-collapse${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="workspace-collapse-trigger"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className="workspace-collapse-title">{title}</span>
        {summary && <span className="workspace-collapse-summary">{summary}</span>}
        <span className="workspace-collapse-chevron" aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="workspace-collapse-body">{children}</div>}
    </div>
  )
}
