'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { t, useLang, type Lang } from '@/lib/i18n'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [lang, setLang] = useState<Lang>('no')

  useEffect(() => setLang(useLang()), [])

  const tx = t[lang]
  if (!pathname) return null
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/embed') ||
    pathname.startsWith('/p/') ||
    pathname.startsWith('/s/') ||
    pathname.startsWith('/epk/') ||
    pathname.startsWith('/admin')
  ) return null

  const campaignHref = pathname.startsWith('/song/') ? `${pathname}#campaign` : '/dashboard#campaign'
  const items = [
    { href: '/dashboard', icon: '⌂', label: tx.mobileNavDashboard, active: pathname.startsWith('/dashboard') },
    { href: '/dashboard#songs', icon: '♪', label: tx.mobileNavSongs, active: pathname.startsWith('/song') },
    { href: '/dashboard#artists', icon: '◎', label: tx.mobileNavArtists, active: pathname.startsWith('/artist') },
    { href: campaignHref, icon: '↗', label: tx.mobileNavCampaign, active: pathname.startsWith('/song') && typeof window !== 'undefined' && window.location.hash === '#campaign' },
    { href: '/settings', icon: '☰', label: tx.mobileNavSettings, active: pathname.startsWith('/settings') || pathname.startsWith('/profile') },
  ]

  return (
    <nav className="mobile-bottom-nav" aria-label={tx.mobileNavLabel}>
      {items.map(item => (
        <Link key={item.label} href={item.href} className={item.active ? 'active' : ''}>
          <span aria-hidden="true">{item.icon}</span>
          <small>{item.label}</small>
        </Link>
      ))}
    </nav>
  )
}
