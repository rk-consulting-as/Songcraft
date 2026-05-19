'use client'

import Link from 'next/link'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import { t, useLang } from '@/lib/i18n'

type Props = {
  ownedCampaigns: CampaignCardData[]
  joinedCount: number
  artistId?: string
}

export default function PlaylistCommunityHints({ ownedCampaigns, joinedCount, artistId }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const hints: { message: string; href?: string; action?: string }[] = []

  const openCampaign = ownedCampaigns.find(c => ['open', 'active'].includes(c.status))
  const needsMembers = ownedCampaigns.find(
    c => ['open', 'active'].includes(c.status) && (c.approvedCount ?? 0) < 3
  )

  if (openCampaign) {
    hints.push({
      message: tx.playlistHintOpenCampaign.replace('{title}', openCampaign.title),
      href: `/playlist-campaigns/${openCampaign.id}`,
      action: tx.playlistCommunityView,
    })
  }
  if (needsMembers) {
    hints.push({
      message: tx.playlistHintNeedsMembers,
      href: `/playlist-campaigns/${needsMembers.id}`,
      action: tx.playlistInviteCreatorsTitle,
    })
  }
  if (joinedCount > 0) {
    hints.push({
      message: tx.playlistHintJoinedCount.replace('{n}', String(joinedCount)),
      href: artistId ? `/artist/${artistId}#playlists` : '/discover',
      action: tx.playlistCommunityJoined,
    })
  }

  if (!hints.length) return null

  return (
    <div className="playlist-community-hints">
      {hints.map((h, i) => (
        <div key={i} className="playlist-community-hint card">
          <p style={{ margin: 0, fontSize: 13, color: '#c8c0b0', lineHeight: 1.5 }}>{h.message}</p>
          {h.href && (
            <Link href={h.href} className="btn-outline" style={{ textDecoration: 'none', fontSize: 12, marginTop: 10, display: 'inline-block' }}>
              {h.action} →
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
