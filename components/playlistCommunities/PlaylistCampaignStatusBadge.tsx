'use client'

import type { CampaignStatus } from '@/lib/playlistCommunities/types'
import { statusBadgeClass } from '@/lib/playlistCommunities/health'
import { t, useLang } from '@/lib/i18n'

export default function PlaylistCampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const tx = t[useLang()] as Record<string, string>
  const label = tx[`playlistStatus${status.charAt(0).toUpperCase()}${status.slice(1)}`] || status
  return (
    <span className={`playlist-status-badge ${statusBadgeClass(status)}`}>
      {label}
    </span>
  )
}
