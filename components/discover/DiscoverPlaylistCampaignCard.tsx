'use client'

import Link from 'next/link'
import type { DiscoverPlaylistCampaign } from '@/lib/discover/types'
import { rulesSummary } from '@/lib/playlistCommunities/serialize'
import { t, useLang } from '@/lib/i18n'

export default function DiscoverPlaylistCampaignCard({
  campaign,
  accent = '#d4a843',
}: {
  campaign: DiscoverPlaylistCampaign
  accent?: string
}) {
  const tx = t[useLang()] as Record<string, string>
  const commitmentKey = `playlistCommitment${campaign.commitmentLevel.charAt(0).toUpperCase()}${campaign.commitmentLevel.slice(1)}`
  const rules = rulesSummary(campaign.rules, 90)

  return (
    <Link href={campaign.href} className="card discover-playlist-campaign-card" style={{ textDecoration: 'none', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {campaign.playlistImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={campaign.playlistImageUrl} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: 8, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>♫</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14, color: '#e8e0d0' }}>{campaign.title}</h3>
          <p style={{ margin: 0, fontSize: 12, color: '#8a7a60' }}>{campaign.playlistTitle}</p>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#6a5a40', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ color: accent }}>{tx[commitmentKey] || campaign.commitmentLevel}</span>
        <span>{tx.playlistCommunityMemberCount.replace('{n}', String(campaign.memberCount))}</span>
      </div>
      {rules && <p style={{ margin: 0, fontSize: 12, color: '#8a7a60', lineHeight: 1.4 }}>{rules}</p>}
      <span style={{ color: accent, fontSize: 12, marginTop: 'auto' }}>{tx.playlistCommunityView} →</span>
    </Link>
  )
}
