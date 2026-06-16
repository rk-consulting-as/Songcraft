'use client'

import { t, useLang } from '@/lib/i18n'
import { workspaceSectionLabelKey } from '@/lib/artistWorkspace/areaMeta'
import type { WorkspaceRoute } from '@/lib/artistWorkspaceTabs'
import { ARTIST_WORKSPACE_SHEET_OPEN_EVENT } from '@/lib/artistWorkspace/areaMeta'

type Props = {
  visible: boolean
  name: string
  avatarUrl?: string | null
  route: WorkspaceRoute
}

export default function ArtistWorkspaceMiniHeader({ visible, name, avatarUrl, route }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const sectionKey = workspaceSectionLabelKey(route)
  const sectionLabel = tx[sectionKey] || sectionKey

  const openMenu = () => {
    window.dispatchEvent(new CustomEvent(ARTIST_WORKSPACE_SHEET_OPEN_EVENT))
  }

  return (
    <header
      className={`artist-workspace-mini-header workspace-glass${visible ? ' is-visible' : ''}`}
      aria-hidden={!visible}
    >
      <div className="artist-workspace-mini-header__identity">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="artist-workspace-mini-header__avatar" />
        ) : (
          <div className="artist-workspace-mini-header__avatar artist-workspace-mini-header__avatar--empty" aria-hidden>🎤</div>
        )}
        <div className="artist-workspace-mini-header__text">
          <span className="artist-workspace-mini-header__name">{name}</span>
          <span className="artist-workspace-mini-header__section">{sectionLabel}</span>
        </div>
      </div>
      <button
        type="button"
        className="artist-workspace-mini-header__menu btn-outline quick-action-btn"
        onClick={openMenu}
        aria-label={tx.artistWorkspaceMiniMenu}
      >
        ☰ {tx.artistWorkspaceMiniMenu}
      </button>
    </header>
  )
}
