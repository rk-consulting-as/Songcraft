'use client'

import Link from 'next/link'
import { useNavigationContext } from '@/components/navigation/NavigationProvider'
import { t, useLang } from '@/lib/i18n'

export default function WorkspaceHeader() {
  const ctx = useNavigationContext()
  const tx = t[useLang()] as Record<string, string>

  if (ctx?.currentSong) {
    return (
      <div className="app-nav-workspace-header">
        <h1 className="app-nav-workspace-header__title">{ctx.currentSong.title || tx.songTitle}</h1>
        <p className="app-nav-workspace-header__subtitle">{tx.songStudioNavLabel}</p>
      </div>
    )
  }

  if (ctx?.currentArtist) {
    const genre = ctx.currentArtist.genre?.trim()
    return (
      <div className="app-nav-workspace-header">
        <h1 className="app-nav-workspace-header__title">{ctx.currentArtist.name}</h1>
        {genre && <p className="app-nav-workspace-header__subtitle">{genre}</p>}
      </div>
    )
  }

  if (ctx?.currentArtistId && !ctx.currentArtist) {
    return (
      <div className="app-nav-workspace-header">
        <h1 className="app-nav-workspace-header__title">{tx.sidebarNavArtistWorkspace}</h1>
      </div>
    )
  }

  return (
    <div className="app-nav-workspace-header">
      <h1 className="app-nav-workspace-header__title">{tx.dashboard}</h1>
    </div>
  )
}

export function AppBreadcrumbs() {
  const ctx = useNavigationContext()
  const tx = t[useLang()] as Record<string, string>

  const crumbs: { label: string; href?: string }[] = [{ label: tx.dashboard, href: '/dashboard' }]

  if (ctx?.currentArtist) {
    crumbs.push({ label: ctx.currentArtist.name, href: `/artist/${ctx.currentArtist.id}` })
  }

  if (ctx?.currentSong) {
    crumbs.push({ label: ctx.currentSong.title || tx.songTitle, href: `/song/${ctx.currentSong.id}` })
  }

  if (crumbs.length <= 1 && !ctx?.currentArtist && !ctx?.currentSong) {
    return null
  }

  return (
    <nav className="app-nav-breadcrumbs" aria-label={tx.sidebarNavBreadcrumbLabel}>
      <ol className="app-nav-breadcrumbs__list">
        {crumbs.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`}>
            {crumb.href && i < crumbs.length - 1 ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
