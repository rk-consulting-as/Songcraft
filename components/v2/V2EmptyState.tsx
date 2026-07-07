import Link from 'next/link'

type Props = {
  icon?: string
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export default function V2EmptyState({ icon = '◎', title, description, actionLabel, actionHref }: Props) {
  return (
    <div className="v2-empty-state">
      <span className="v2-empty-state__icon" aria-hidden>{icon}</span>
      <h4>{title}</h4>
      <p className="v2-meta">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="v2-btn secondary sm">{actionLabel}</Link>
      )}
    </div>
  )
}
