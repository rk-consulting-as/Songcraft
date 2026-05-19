'use client'

import type { CampaignHealthSignal } from '@/lib/playlistCommunities/health'
import { t, useLang } from '@/lib/i18n'

const DISPLAY_SIGNALS: CampaignHealthSignal[] = [
  'ready_to_launch',
  'needs_setup',
  'capacity_full',
  'capacity_nearly_full',
  'capacity_empty',
  'members_inactive',
  'songs_missing_links',
]

export default function CampaignHealthIndicators({ signals }: { signals: CampaignHealthSignal[] }) {
  const tx = t[useLang()] as Record<string, string>
  const shown = DISPLAY_SIGNALS.filter(s => signals.includes(s))
  if (!shown.length) return null

  return (
    <div className="playlist-health-indicators" role="list">
      {shown.map(signal => (
        <span
          key={signal}
          className={`playlist-health-chip playlist-health-chip--${signal.replace(/_/g, '-')}`}
          role="listitem"
        >
          {tx[`playlistHealth_${signal}`] || signal}
        </span>
      ))}
    </div>
  )
}
