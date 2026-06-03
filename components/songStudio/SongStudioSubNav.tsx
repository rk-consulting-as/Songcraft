'use client'

type Item = { id: string; label: string }

export default function SongStudioSubNav({
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
  if (items.length <= 1) return null

  return (
    <nav className="hub-sub-nav song-studio-sub-nav" aria-label={ariaLabel}>
      <div className="hub-sub-nav__scroll" role="tablist">
        {items.map(item => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'true' : undefined}
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
