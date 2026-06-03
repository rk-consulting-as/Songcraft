'use client'

import Link from 'next/link'
import { SIDEBAR_MAIN_SECTIONS } from '@/lib/navigation/sidebarConfig'
import { t, useLang } from '@/lib/i18n'

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
}

/** Minimal sidebar when NavigationProvider data fails — keeps core links working. */
export default function AppSidebarFallback({ collapsed, onToggleCollapsed }: Props) {
  const tx = t[useLang()] as Record<string, string>

  return (
    <aside className={`app-nav-sidebar app-nav-sidebar--fallback${collapsed ? ' app-nav-sidebar--collapsed' : ''}`}>
      <div className="app-nav-sidebar__head">
        {!collapsed && <span className="app-nav-sidebar__head-label">{tx.sidebarNavLabel}</span>}
        <button type="button" className="app-nav-sidebar__collapse" onClick={onToggleCollapsed}>
          {collapsed ? '»' : '«'}
        </button>
      </div>
      <nav className="app-nav-sidebar__nav">
        <Link href="/dashboard" className="app-nav-sidebar__item">
          <span className="app-nav-sidebar__icon" aria-hidden>🏠</span>
          {!collapsed && <span className="app-nav-sidebar__label">{tx.dashboard}</span>}
        </Link>
        <Link href="/dashboard#artists" className="app-nav-sidebar__item">
          <span className="app-nav-sidebar__icon" aria-hidden>🎤</span>
          {!collapsed && <span className="app-nav-sidebar__label">{tx.sidebarNavArtists}</span>}
        </Link>
        {SIDEBAR_MAIN_SECTIONS.map(section => (
          <div key={section.id} className="app-nav-sidebar__group">
            <div className="app-nav-sidebar__item app-nav-sidebar__item--section">
              <span className="app-nav-sidebar__icon" aria-hidden>{section.icon}</span>
              {!collapsed && <span className="app-nav-sidebar__label">{tx[section.labelKey] || section.labelKey}</span>}
            </div>
            {!collapsed && (
              <ul className="app-nav-sidebar__sub">
                {section.items.filter(item => item.href && !item.disabled).map(item => (
                  <li key={item.id}>
                    <Link href={item.href!}>{tx[item.labelKey] || item.labelKey}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
