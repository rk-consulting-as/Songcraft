'use client'

import Link from 'next/link'
import type { CampaignCardData, CampaignStatus } from '@/lib/playlistCommunities/types'
import { rulesSummary } from '@/lib/playlistCommunities/serialize'
import { t, useLang } from '@/lib/i18n'
import PlaylistCampaignStatusBadge from './PlaylistCampaignStatusBadge'

type Props = {
  campaign: CampaignCardData
  accent?: string
  onManage?: () => void
  onRequestJoin?: () => void
}

function ctaForCampaign(campaign: CampaignCardData): 'manage' | 'view' | 'pending' | 'join' | 'closed' {
  if (campaign.isOwner) return 'manage'
  if (['closed', 'archived', 'draft'].includes(campaign.status)) return 'view'
  if (campaign.myMembership?.status === 'requested') return 'pending'
  if (campaign.myMembership?.status === 'approved') return 'view'
  if (['open', 'active'].includes(campaign.status)) return 'join'
  return 'view'
}

export default function PlaylistCampaignCard({ campaign, accent = '#d4a843', onManage, onRequestJoin }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const img = campaign.playlist?.image_url
  const rules = rulesSummary(campaign.rules, 90)
  const commitmentKey = `playlistCommitment${campaign.commitment_level.charAt(0).toUpperCase()}${campaign.commitment_level.slice(1)}`
  const commitmentLabel = tx[commitmentKey] || campaign.commitment_level
  const cta = ctaForCampaign(campaign)
  const atCapacity =
    campaign.max_members != null && (campaign.memberCount ?? 0) >= campaign.max_members

  return (
    <article className="card playlist-campaign-card">
      <div className="playlist-campaign-card__top">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="playlist-campaign-card__cover" />
        ) : (
          <div className="playlist-campaign-card__cover playlist-campaign-card__cover--empty">♫</div>
        )}
        <div className="playlist-campaign-card__meta">
          <div className="playlist-campaign-card__badges">
            <PlaylistCampaignStatusBadge status={campaign.status as CampaignStatus} />
            <span className="playlist-campaign-card__commitment">{commitmentLabel}</span>
            {campaign.isLookingForMembers && ['open', 'active'].includes(campaign.status) && (
              <span className="playlist-campaign-card__looking">{tx.campaignCardLookingForMembers}</span>
            )}
          </div>
          <h3 className="playlist-campaign-card__title">{campaign.title}</h3>
          <p className="playlist-campaign-card__playlist">{campaign.playlist?.title || tx.playlistCommunityPlaylist}</p>
          {campaign.artistName && <p className="playlist-campaign-card__host">{campaign.artistName}</p>}
        </div>
      </div>

      <div className="playlist-campaign-card__stats">
        {(campaign.genre || campaign.mood) && (
          <span className="playlist-meta-chip">{[campaign.genre, campaign.mood].filter(Boolean).join(' · ')}</span>
        )}
        <span>{tx.playlistCommunityMemberCount.replace('{n}', String(campaign.memberCount ?? 0))}</span>
        {atCapacity && <span className="playlist-campaign-card__full">{tx.playlistCampaignFull}</span>}
        {(campaign.pendingProofCount ?? 0) > 0 && campaign.isOwner && (
          <span className="playlist-campaign-card__proof-pending">
            {tx.campaignCardPendingProofs.replace('{n}', String(campaign.pendingProofCount))}
          </span>
        )}
        {(campaign.approvedThisWeek ?? 0) > 0 && (
          <span className="playlist-campaign-card__proof-approved">
            {tx.campaignCardApprovedWeek.replace('{n}', String(campaign.approvedThisWeek))}
          </span>
        )}
        {(campaign.activityThisWeek ?? campaign.approvedThisWeek ?? 0) > 0 && !campaign.isOwner && (
          <span className="playlist-campaign-card__activity">
            {tx.campaignCardActivityWeek.replace('{n}', String(campaign.activityThisWeek ?? campaign.approvedThisWeek))}
          </span>
        )}
        {(campaign.membersNeedingAttention ?? 0) > 0 && campaign.isOwner && (
          <span className="playlist-campaign-card__proof-attention">
            {tx.campaignCardNeedsAttention.replace('{n}', String(campaign.membersNeedingAttention))}
          </span>
        )}
      </div>

      {rules && <p className="playlist-campaign-card__rules">{rules}</p>}

      <div className="playlist-campaign-card__actions">
        <Link href={`/playlist-campaigns/${campaign.id}`} className="btn-outline playlist-campaign-card__btn">
          {tx.playlistCommunityView}
        </Link>
        {cta === 'manage' && onManage && (
          <button type="button" className="btn-gold playlist-campaign-card__btn" onClick={onManage}>{tx.playlistCommunityManage}</button>
        )}
        {cta === 'join' && onRequestJoin && !atCapacity && (
          <button type="button" className="btn-gold playlist-campaign-card__btn" onClick={onRequestJoin}>
            {tx.playlistCommunityRequestJoin}
          </button>
        )}
        {cta === 'pending' && (
          <span className="playlist-campaign-card__pending">{tx.playlistCommunityPending}</span>
        )}
      </div>
    </article>
  )
}
