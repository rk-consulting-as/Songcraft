'use client'

type Item = { id: string; label: string }

export default function HubSubNav({
  items,
  active,
  onChange,
  ariaLabel,
}: {
  items: Item[]
  active: string
  onChange: (id: string) => void
  ariaLabel: string
}) {
  return (
    <nav className="hub-sub-nav" aria-label={ariaLabel}>
      <div className="hub-sub-nav__scroll" role="tablist">
        {items.map(item => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`hub-sub-nav__tab${isActive ? ' is-active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
