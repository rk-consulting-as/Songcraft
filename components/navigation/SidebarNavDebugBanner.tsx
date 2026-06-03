'use client'

import { t, useLang } from '@/lib/i18n'

export default function SidebarNavDebugBanner() {
  const tx = t[useLang()] as Record<string, string>

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="sidebar-nav-debug" role="status">
      {tx.sidebarNavDebugDisabled}
    </div>
  )
}
