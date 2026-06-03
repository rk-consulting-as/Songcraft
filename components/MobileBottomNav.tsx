'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { t, useLang, type Lang } from '@/lib/i18n'
import { parseWorkspaceHash } from '@/lib/artistWorkspaceTabs'
import { parseSongStudioHash } from '@/lib/songStudio/routes'
import { SONG_STUDIO_SHEET_OPEN_EVENT } from '@/lib/songStudio/areaMeta'

function resolveNavHrefs(pathname: string) {
  const artistMatch = pathname.match(/^\/artist\/([^/]+)/)
  const artistId = artistMatch?.[1]

  const songsHref = artistId
    ? `/artist/${artistId}#content-songs`
    : '/dashboard#songs'

  const artistsHref = '/dashboard#artists'

  const campaignHref = artistId
    ? `/growth?artist=${artistId}#community`
    : pathname.startsWith('/song/')
      ? `${pathname}#campaign`
      : '/growth#community'

  return { songsHref, artistsHref, campaignHref, artistId }
}

function resolveArtistWorkspaceHash(hash: string) {
  const route = parseWorkspaceHash(hash)
  return route.area
}

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [lang, setLang] = useState<Lang>('en')
  const [hash, setHash] = useState('')

  useEffect(() => setLang(useLang()), [])

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash.replace(/^#/, ''))
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [pathname])

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

  const { songsHref, artistsHref, campaignHref, artistId } = resolveNavHrefs(pathname)

  const songMatch = pathname.match(/^\/song\/([^/]+)/)
  if (songMatch) {
    const base = pathname
    const route = parseSongStudioHash(`#${hash}`)
    const area = route.area
    const hiddenAreas = area === 'promote' || area === 'publish' || area === 'settings'
    const items = [
      { href: `${base}#overview`, icon: '⌂', label: tx.songStudioOverview, active: area === 'overview' || !hash, kind: 'link' as const },
      { href: `${base}#lyrics`, icon: '✎', label: tx.songStudioWrite, active: area === 'write', kind: 'link' as const },
      { href: `${base}#suno`, icon: '♫', label: tx.songStudioProduce, active: area === 'produce', kind: 'link' as const },
      { href: `${base}#campaign`, icon: '↗', label: tx.songStudioRelease, active: area === 'release', kind: 'link' as const },
      { icon: '☰', label: tx.mobileNavMore, active: hiddenAreas, kind: 'more' as const },
    ]

    return (
      <nav className="mobile-bottom-nav" aria-label={tx.mobileNavLabel}>
        {items.map(item => {
          if (item.kind === 'more') {
            return (
              <button
                key={item.label}
                type="button"
                className={item.active ? 'active' : ''}
                onClick={() => window.dispatchEvent(new CustomEvent(SONG_STUDIO_SHEET_OPEN_EVENT))}
              >
                <span aria-hidden="true">{item.icon}</span>
                <small>{item.label}</small>
              </button>
            )
          }
          return (
            <Link key={item.label} href={item.href!} className={item.active ? 'active' : ''}>
              <span aria-hidden="true">{item.icon}</span>
              <small>{item.label}</small>
            </Link>
          )
        })}
      </nav>
    )
  }

  if (artistId && pathname.startsWith(`/artist/${artistId}`)) {
    const base = `/artist/${artistId}`
    const area = resolveArtistWorkspaceHash(`#${hash}`)
    const items = [
      { href: `${base}#overview`, icon: '⌂', label: tx.mobileNavDashboard, active: area === 'overview' || !hash },
      { href: `${base}#content-songs`, icon: '♪', label: tx.mobileNavContent, active: area === 'content' },
      { href: `${base}#promotion-campaigns`, icon: '↗', label: tx.mobileNavPromotion, active: area === 'promotion' },
      { href: `/growth?artist=${artistId}`, icon: '🌱', label: tx.mobileNavGrowth, active: pathname.startsWith('/growth') },
      { href: `${base}#brand-presence`, icon: '☰', label: tx.mobileNavMore, active: area === 'brand' || area === 'settings' },
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

  const campaignHashActive = hash === 'campaign' || hash === 'playlists' || hash === 'promotion-campaigns' || hash === 'promotion-playlists'

  const items = [
    { href: '/dashboard', icon: '⌂', label: tx.mobileNavDashboard, active: pathname.startsWith('/dashboard') && !campaignHashActive },
    { href: songsHref, icon: '♪', label: tx.mobileNavSongs, active: pathname.startsWith('/song') || (pathname.startsWith('/artist') && (hash === 'songs' || hash.startsWith('content-'))) },
    { href: artistsHref, icon: '◎', label: tx.mobileNavArtists, active: pathname.startsWith('/artist') },
    { href: campaignHref, icon: '↗', label: tx.mobileNavCampaign, active: campaignHashActive || pathname.startsWith('/playlist-campaigns') || pathname.startsWith('/growth') },
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
