'use client'

import Link from 'next/link'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import type { UserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'
import { t, useLang } from '@/lib/i18n'

type Props = {
  ownedCampaigns: CampaignCardData[]
  joinedCount: number
  artistId?: string
  participationSummary?: UserParticipationSummary | null
}

export default function PlaylistCommunityHints({
  ownedCampaigns,
  joinedCount,
  artistId,
  participationSummary,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const hints: { message: string; href?: string; action?: string; variant?: string }[] = []

  const openCampaign = ownedCampaigns.find(c => ['open', 'active'].includes(c.status))
  const needsMembers = ownedCampaigns.find(
    c => ['open', 'active'].includes(c.status) && (c.approvedCount ?? 0) < 3
  )

  if (participationSummary?.pendingReviews) {
    hints.push({
      message: tx.playlistHintPendingProofs.replace('{n}', String(participationSummary.pendingReviews)),
      href: participationSummary.reviewCampaignId
        ? `/playlist-campaigns/${participationSummary.reviewCampaignId}`
        : undefined,
      action: tx.dashboardReviewProofs,
      variant: 'attention',
    })
  }
  if (participationSummary?.membersNeedingAttention) {
    hints.push({
      message: tx.playlistHintMembersAttention.replace(
        '{n}',
        String(participationSummary.membersNeedingAttention)
      ),
      href: participationSummary.reviewCampaignId
        ? `/playlist-campaigns/${participationSummary.reviewCampaignId}`
        : undefined,
      action: tx.participationBoardTitle,
      variant: 'attention',
    })
  }
  if (participationSummary && participationSummary.weekCompletionPercent < 100) {
    hints.push({
      message: tx.playlistHintWeekProgress.replace(
        '{percent}',
        String(participationSummary.weekCompletionPercent)
      ),
      href: artistId ? `/artist/${artistId}#playlists` : '/discover',
      action: tx.dashboardWeekCompletion,
    })
  }
  if (participationSummary?.joinedNeedingProofToday) {
    hints.push({
      message: tx.playlistHintProofToday,
      href: participationSummary.proofTodayCampaignId
        ? `/playlist-campaigns/${participationSummary.proofTodayCampaignId}`
        : '/discover',
      action: tx.activityProofSubmitButton,
      variant: 'attention',
    })
  }

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
  if (joinedCount > 0 && !participationSummary?.joinedNeedingProofToday) {
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
        <div
          key={i}
          className={`playlist-community-hint card${h.variant === 'attention' ? ' playlist-community-hint--attention' : ''}`}
        >
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
