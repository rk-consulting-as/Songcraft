'use client'

import Link from 'next/link'
import type { CampaignCardData } from '@/lib/playlistCommunities/types'
import { rulesSummary } from '@/lib/playlistCommunities/serialize'
import { t, useLang } from '@/lib/i18n'

type Props = {
  campaign: CampaignCardData
  accent?: string
  onManage?: () => void
  onRequestJoin?: () => void
}

export default function PlaylistCampaignCard({ campaign, accent = '#d4a843', onManage, onRequestJoin }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const img = campaign.playlist?.image_url
  const rules = rulesSummary(campaign.rules, 100)
  const commitmentKey = `playlistCommitment${campaign.commitment_level.charAt(0).toUpperCase()}${campaign.commitment_level.slice(1)}`
  const commitmentLabel = tx[commitmentKey] || campaign.commitment_level

  return (
    <article className="card playlist-campaign-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 8, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>♫</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#e8e0d0', lineHeight: 1.3 }}>{campaign.title}</h3>
          <p style={{ margin: 0, fontSize: 12, color: '#8a7a60' }}>{campaign.playlist?.title || tx.playlistCommunityPlaylist}</p>
          {campaign.artistName && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#6a5a40' }}>{campaign.artistName}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
        <span style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${accent}44`, color: accent }}>{commitmentLabel}</span>
        {(campaign.genre || campaign.mood) && (
          <span style={{ color: '#6a5a40' }}>{[campaign.genre, campaign.mood].filter(Boolean).join(' · ')}</span>
        )}
        <span style={{ color: '#6a5a40' }}>{tx.playlistCommunityMemberCount.replace('{n}', String(campaign.memberCount ?? 0))}</span>
        <span style={{ color: '#6a5a40', textTransform: 'capitalize' }}>{campaign.status}</span>
      </div>

      {rules && <p style={{ margin: 0, fontSize: 12, color: '#8a7a60', lineHeight: 1.45 }}>{rules}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        <Link href={`/playlist-campaigns/${campaign.id}`} className="btn-outline" style={{ textDecoration: 'none', fontSize: 12 }}>
          {tx.playlistCommunityView}
        </Link>
        {campaign.isOwner && onManage ? (
          <button type="button" className="btn-gold" style={{ fontSize: 12 }} onClick={onManage}>{tx.playlistCommunityManage}</button>
        ) : !campaign.isOwner && onRequestJoin && ['open', 'active'].includes(campaign.status) ? (
          <button type="button" className="btn-gold" style={{ fontSize: 12 }} onClick={onRequestJoin}>
            {campaign.myMembership?.status === 'requested' ? tx.playlistCommunityPending : tx.playlistCommunityRequestJoin}
          </button>
        ) : null}
      </div>
    </article>
  )
}
