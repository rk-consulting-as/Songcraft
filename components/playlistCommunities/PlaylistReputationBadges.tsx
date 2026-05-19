'use client'

import type { PlaylistReputationBadge } from '@/lib/playlistCommunities/reputation'
import { t, useLang } from '@/lib/i18n'

export default function PlaylistReputationBadges({ badges }: { badges: PlaylistReputationBadge[] }) {
  const tx = t[useLang()] as Record<string, string>
  const earned = badges.filter(b => b.earned)
  if (!earned.length) return null

  return (
    <div className="playlist-reputation-badges">
      <p className="playlist-reputation-badges__label">{tx.playlistReputationTitle}</p>
      <div className="playlist-reputation-badges__row">
        {earned.map(b => (
          <span
            key={b.id}
            className={`playlist-reputation-badge${b.placeholder ? ' is-placeholder' : ''}`}
            title={b.placeholder ? tx.playlistBadgePlaceholderHint : undefined}
          >
            <span aria-hidden>{b.icon}</span>
            {tx[b.labelKey]}
          </span>
        ))}
      </div>
    </div>
  )
}
