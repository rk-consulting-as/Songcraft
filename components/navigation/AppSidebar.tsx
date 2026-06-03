'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNavigationContext } from '@/components/navigation/NavigationProvider'
import {
  ARTIST_TREE_CHILDREN,
  SIDEBAR_MAIN_SECTIONS,
  artistTreeHref,
  isArtistHashActive,
  isPathActive,
  storiesAssetHref,
} from '@/lib/navigation/sidebarConfig'
import { isSidebarNavCollapsed, setSidebarNavCollapsed } from '@/lib/navigation/featureFlags'
import { t, useLang } from '@/lib/i18n'

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function AppSidebar({ collapsed, onToggleCollapsed }: Props) {
  const pathname = usePathname() || ''
  const ctx = useNavigationContext()
  const tx = t[useLang()] as Record<string, string>

  const dashboardActive = pathname === '/dashboard' || pathname.startsWith('/dashboard/')

  return (
    <aside
      className={`app-nav-sidebar${collapsed ? ' app-nav-sidebar--collapsed' : ''}`}
      aria-label={tx.sidebarNavLabel}
    >
      <div className="app-nav-sidebar__head">
        {!collapsed && <span className="app-nav-sidebar__head-label">{tx.sidebarNavLabel}</span>}
        <button
          type="button"
          className="app-nav-sidebar__collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? tx.sidebarNavExpand : tx.sidebarNavCollapse}
          title={collapsed ? tx.sidebarNavExpand : tx.sidebarNavCollapse}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="app-nav-sidebar__nav">
        <Link
          href="/dashboard"
          className={`app-nav-sidebar__item${dashboardActive ? ' is-active' : ''}`}
          title={tx.dashboard}
        >
          <span className="app-nav-sidebar__icon" aria-hidden>🏠</span>
          {!collapsed && <span className="app-nav-sidebar__label">{tx.dashboard}</span>}
        </Link>

        <div className={`app-nav-sidebar__group${ctx?.currentArtistId ? ' is-active-group' : ''}`}>
          <div className={`app-nav-sidebar__item app-nav-sidebar__item--section${pathname.startsWith('/artist/') || pathname.startsWith('/song/') ? ' is-active' : ''}`}>
            <span className="app-nav-sidebar__icon" aria-hidden>🎤</span>
            {!collapsed && <span className="app-nav-sidebar__label">{tx.sidebarNavArtists}</span>}
          </div>

          {!collapsed && (
            <div className="app-nav-sidebar__tree">
              {(ctx?.artists || []).map(artist => {
                const expanded = ctx?.expandedArtistIds.has(artist.id) ?? false
                const isCurrentArtist = ctx?.currentArtistId === artist.id
                const showSong = isCurrentArtist && ctx?.currentSong

                return (
                  <div key={artist.id} className={`app-nav-sidebar__artist${isCurrentArtist ? ' is-current' : ''}`}>
                    <div className="app-nav-sidebar__artist-head">
                      <button
                        type="button"
                        className="app-nav-sidebar__artist-toggle"
                        onClick={() => ctx?.toggleArtistExpanded(artist.id)}
                        aria-expanded={expanded}
                        aria-label={expanded ? tx.sidebarNavCollapseArtist : tx.sidebarNavExpandArtist}
                      >
                        {expanded ? '▼' : '▶'}
                      </button>
                      <Link
                        href={`/artist/${artist.id}`}
                        className={`app-nav-sidebar__artist-name${isCurrentArtist && !ctx?.currentSong ? ' is-active' : ''}`}
                      >
                        {artist.name}
                      </Link>
                    </div>
                    {expanded && (
                      <ul className="app-nav-sidebar__artist-children">
                        {ARTIST_TREE_CHILDREN.map(child => {
                          const href = artistTreeHref(artist.id, child.hash)
                          const hashActive = isCurrentArtist && !ctx?.currentSong && isArtistHashActive(ctx?.pageHash || '', child.hash)
                          return (
                            <li key={child.id}>
                              <Link href={href} className={hashActive ? 'is-active' : undefined}>
                                {tx[child.labelKey] || child.labelKey}
                              </Link>
                            </li>
                          )
                        })}
                        {showSong && (
                          <li>
                            <Link href={`/song/${ctx.currentSong!.id}`} className="is-active is-song">
                              {ctx.currentSong!.title || tx.songTitle}
                            </Link>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )
              })}
              {(ctx?.artists?.length ?? 0) === 0 && (
                <p className="app-nav-sidebar__empty">{tx.sidebarNavNoArtists}</p>
              )}
            </div>
          )}
        </div>

        {SIDEBAR_MAIN_SECTIONS.map(section => {
          const sectionActive = isPathActive(pathname, section.matchPaths)
          const expanded = ctx?.expandedSections.has(section.id) ?? true

          return (
            <div key={section.id} className={`app-nav-sidebar__group${sectionActive ? ' is-active-group' : ''}`}>
              <button
                type="button"
                className={`app-nav-sidebar__item app-nav-sidebar__item--section${sectionActive ? ' is-active' : ''}`}
                onClick={() => !collapsed && ctx?.toggleSectionExpanded(section.id)}
                title={tx[section.labelKey] || section.labelKey}
              >
                <span className="app-nav-sidebar__icon" aria-hidden>{section.icon}</span>
                {!collapsed && (
                  <>
                    <span className="app-nav-sidebar__label">{tx[section.labelKey] || section.labelKey}</span>
                    <span className="app-nav-sidebar__chevron" aria-hidden>{expanded ? '▾' : '▸'}</span>
                  </>
                )}
              </button>
              {!collapsed && expanded && (
                <ul className="app-nav-sidebar__sub">
                  {section.items.map(item => {
                    if (item.id === 'stories') {
                      const href = storiesAssetHref(ctx?.currentArtistId ?? null)
                      if (!href) {
                        return (
                          <li key={item.id}>
                            <span className="app-nav-sidebar__future">
                              {tx.sidebarNavStories}
                              <span className="app-nav-sidebar__badge">{tx.importComingLater}</span>
                            </span>
                          </li>
                        )
                      }
                      const active = pathname.startsWith('/artist/') && isArtistHashActive(ctx?.pageHash || '', 'content-stories')
                      return (
                        <li key={item.id}>
                          <Link href={href} className={active ? 'is-active' : undefined}>
                            {tx.sidebarNavStories}
                          </Link>
                        </li>
                      )
                    }

                    if (item.disabled || item.future) {
                      return (
                        <li key={item.id}>
                          <span className="app-nav-sidebar__future">
                            {tx[item.labelKey] || item.labelKey}
                            <span className="app-nav-sidebar__badge">{tx.importComingLater}</span>
                          </span>
                        </li>
                      )
                    }

                    const active = isPathActive(pathname, item.matchPaths)
                    return (
                      <li key={item.id}>
                        <Link href={item.href || '#'} className={active ? 'is-active' : undefined}>
                          {tx[item.labelKey] || item.labelKey}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export function useSidebarCollapsedState() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(isSidebarNavCollapsed())
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      setSidebarNavCollapsed(next)
      return next
    })
  }

  return { collapsed, toggleCollapsed }
}
