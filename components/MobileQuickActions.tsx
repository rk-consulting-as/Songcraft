'use client'

type Action = {
  label: string
  icon?: string
  href?: string
  onClick?: () => void
  disabled?: boolean
}

export default function MobileQuickActions({
  title,
  actions,
}: {
  title: string
  actions: Action[]
}) {
  const visible = actions.filter(Boolean)
  if (visible.length === 0) return null

  return (
    <div className="mobile-quick-actions" aria-label={title}>
      <div className="mobile-quick-actions-title">{title}</div>
      <div className="mobile-quick-actions-scroll">
        {visible.map(action => {
          const content = (
            <>
              {action.icon && <span aria-hidden="true">{action.icon}</span>}
              <span>{action.label}</span>
            </>
          )
          if (action.href && !action.disabled) {
            return <a key={action.label} href={action.href}>{content}</a>
          }
          return (
            <button key={action.label} type="button" onClick={action.onClick} disabled={action.disabled}>
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
