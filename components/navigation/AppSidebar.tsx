'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { applyArtistWorkspaceHash } from '@/lib/artistWorkspaceNavigation'
import { applySongStudioHash } from '@/lib/songStudio/navigation'
import { useNavigationContext } from '@/components/navigation/NavigationProvider'
import { getArtistSidebarBadges, getSongSidebarBadges } from '@/lib/navigation/badges'
import {
  ARTIST_TREE,
  SIDEBAR_MAIN_SECTIONS,
  SONG_TREE,
  type ArtistTreeNode,
  artistTreeHref,
  isArtistHashActive,
  isArtistTreeGroupActive,
  isPathActive,
  isSongTreeHashActive,
  songTreeHref,
  storiesAssetHref,
} from '@/lib/navigation/sidebarConfig'
import { isSidebarNavCollapsed, setSidebarNavCollapsed } from '@/lib/navigation/featureFlags'
import { t, useLang } from '@/lib/i18n'

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
}

function StatusBadges({ badges }: { badges: { key: string; label: string }[] }) {
  if (!badges.length) return null
  return (
    <span className="app-nav-sidebar__status-badges">
      {badges.map(b => (
        <span key={b.key} className={`app-nav-sidebar__status app-nav-sidebar__status--${b.key}`}>
          {b.label}
        </span>
      ))}
    </span>
  )
}

function ArtistTreeNodes({
  nodes,
  artistId,
  isCurrentArtist,
  pageHash,
  pathname,
  tx,
  depth = 0,
}: {
  nodes: ArtistTreeNode[]
  artistId: string
  isCurrentArtist: boolean
  pageHash: string
  pathname: string
  tx: Record<string, string>
  depth?: number
}) {
  return (
    <>
      {nodes.map(node => {
        if (node.children?.length) {
          const groupActive = isCurrentArtist && isArtistTreeGroupActive(pageHash, node)
          return (
            <li key={node.id} className={`app-nav-sidebar__tree-group${groupActive ? ' is-active-group' : ''}`}>
              <span className="app-nav-sidebar__tree-group-label" style={{ paddingLeft: depth * 8 }}>
                {tx[node.labelKey] || node.labelKey}
              </span>
              <ul className="app-nav-sidebar__artist-children">
                <ArtistTreeNodes
                  nodes={node.children}
                  artistId={artistId}
                  isCurrentArtist={isCurrentArtist}
                  pageHash={pageHash}
                  pathname={pathname}
                  tx={tx}
                  depth={depth + 1}
                />
              </ul>
            </li>
          )
        }

        if (!node.hash) return null
        const href = artistTreeHref(artistId, node.hash)
        const active = isCurrentArtist && isArtistHashActive(pageHash, node.hash)
        const onArtistWorkspaceNav = (e: MouseEvent<HTMLAnchorElement>) => {
          if (pathname === `/artist/${artistId}`) {
            e.preventDefault()
            applyArtistWorkspaceHash(node.hash!)
          }
        }
        return (
          <li key={node.id}>
            <Link
              href={href}
              className={active ? 'is-active' : undefined}
              style={{ paddingLeft: 8 + depth * 8 }}
              onClick={onArtistWorkspaceNav}
            >
              {tx[node.labelKey] || node.labelKey}
            </Link>
          </li>
        )
      })}
    </>
  )
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
                const artistSongs = (ctx?.songs || []).filter(s => s.artist_id === artist.id)
                const artistBadges = getArtistSidebarBadges(artist, artistSongs, tx)
                const showCurrentSong = isCurrentArtist && ctx?.currentSong
                const songExpanded = showCurrentSong && (ctx?.expandedSongIds.has(ctx.currentSong!.id) ?? true)

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
                      <StatusBadges badges={artistBadges} />
                    </div>
                    {expanded && (
                      <ul className="app-nav-sidebar__artist-children">
                        <ArtistTreeNodes
                          nodes={ARTIST_TREE}
                          artistId={artist.id}
                          isCurrentArtist={isCurrentArtist}
                          pageHash={ctx?.pageHash || ''}
                          pathname={pathname}
                          tx={tx}
                        />
                        {showCurrentSong && (
                          <li className="app-nav-sidebar__song-branch">
                            <div className="app-nav-sidebar__song-head">
                              <button
                                type="button"
                                className="app-nav-sidebar__artist-toggle"
                                onClick={() => ctx?.toggleSongExpanded(ctx.currentSong!.id)}
                                aria-expanded={!!songExpanded}
                              >
                                {songExpanded ? '▼' : '▶'}
                              </button>
                              <Link
                                href={songTreeHref(ctx.currentSong!.id, '')}
                                className="is-active is-song"
                              >
                                {ctx.currentSong!.title || tx.songTitle}
                              </Link>
                              <StatusBadges badges={getSongSidebarBadges(
                                ctx.currentSong!,
                                !!artist.page_enabled,
                                tx,
                              )} />
                            </div>
                            {songExpanded && (
                              <ul className="app-nav-sidebar__song-children">
                                {SONG_TREE.map(item => {
                                  const href = songTreeHref(ctx.currentSong!.id, item.hash)
                                  const active = isSongTreeHashActive(ctx?.pageHash || '', item.hash)
                                  const onSongStudioNav = (e: MouseEvent<HTMLAnchorElement>) => {
                                    if (pathname === `/song/${ctx.currentSong!.id}`) {
                                      e.preventDefault()
                                      applySongStudioHash(item.hash)
                                    }
                                  }
                                  return (
                                    <li key={item.id}>
                                      <Link
                                        href={href}
                                        className={active ? 'is-active' : undefined}
                                        onClick={onSongStudioNav}
                                      >
                                        {tx[item.labelKey] || item.labelKey}
                                      </Link>
                                    </li>
                                  )
                                })}
                              </ul>
                            )}
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
