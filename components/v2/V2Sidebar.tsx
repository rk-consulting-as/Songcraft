'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { V2_NAV_ITEMS } from '@/lib/v2/navigation'
import { V2_ROUTES } from '@/lib/v2/routes'
import { useV2Toast } from './V2Toast'

export default function V2Sidebar() {
  const pathname = usePathname() || ''
  const { showToast } = useV2Toast()

  return (
    <aside className="v2-sidebar">
      <Link href={V2_ROUTES.home} className="v2-brand">
        <div className="v2-logo">V</div>
        <div>
          <h1>ViaTone</h1>
          <span>v2.0 Community</span>
        </div>
      </Link>
      <nav className="v2-nav" aria-label="Community navigation">
        {V2_NAV_ITEMS.map(item => {
          const active = item.id === 'community'
            ? pathname === '/community'
            : pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
          return (
            <Link key={item.id} href={item.href} className={active ? 'active' : undefined}>
              {item.label}
              {item.badge ? <span className="v2-nav-badge">{item.badge}</span> : null}
            </Link>
          )
        })}
      </nav>
      <div className="v2-sidebar-card">
        <b>Powered by Aigent4U</b>
        <p>Playlist queue, Auto-Switch, shuffle, play logs and session reports — unified as the ViaTone Stream Engine.</p>
        <button type="button" className="v2-btn hot" onClick={() => showToast('Host mode — connect Stream Engine in Host Pro')}>
          Host session
        </button>
      </div>
      <p className="v2-legacy-link">
        Studio tools: <Link href="/dashboard">Legacy dashboard</Link>
      </p>
    </aside>
  )
}
