'use client'

import { t, useLang } from '@/lib/i18n'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'

export default function ArtistWorkspaceStoriesPlaceholder() {
  const tx = t[useLang()] as Record<string, string>

  return (
    <div className="workspace-section stories-foundation">
      <div className="card workspace-card workspace-glass">
        <WorkspaceEmptyState
          icon="📖"
          title={tx.workspaceShellStoriesTitle}
          description={tx.workspaceShellStoriesDesc}
        />
      </div>

      <div className="card workspace-card workspace-glass">
        <h3 className="workspace-card-title">{tx.storiesBehindTheSong}</h3>
        <p className="workspace-section-desc">{tx.storiesBehindTheSongDesc}</p>
      </div>

      <div className="stories-foundation__grid">
        <div className="card workspace-card workspace-glass stories-foundation__card">
          <span className="stories-foundation__icon" aria-hidden="true">✍</span>
          <h4 className="stories-foundation__title">{tx.storiesGenerateFromSong}</h4>
          <p className="stories-foundation__desc">{tx.storiesGenerateFromSongDesc}</p>
          <button type="button" className="btn-outline quick-action-btn" disabled>
            {tx.storiesComingSoon}
          </button>
        </div>
        <div className="card workspace-card workspace-glass stories-foundation__card">
          <span className="stories-foundation__icon" aria-hidden="true">🎬</span>
          <h4 className="stories-foundation__title">{tx.storiesBehindTheSong}</h4>
          <p className="stories-foundation__desc">{tx.storiesBehindTheSongCardDesc}</p>
          <button type="button" className="btn-outline quick-action-btn" disabled>
            {tx.storiesComingSoon}
          </button>
        </div>
      </div>
    </div>
  )
}
