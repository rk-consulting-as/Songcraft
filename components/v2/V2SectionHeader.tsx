import type { ReactNode } from 'react'

type Props = {
  title: string
  lead?: string
  action?: ReactNode
}

export default function V2SectionHeader({ title, lead, action }: Props) {
  return (
    <div className="v2-section-head">
      <div>
        <h3>{title}</h3>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {action}
    </div>
  )
}
