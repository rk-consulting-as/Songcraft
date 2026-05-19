'use client'

import { useState } from 'react'
import { fullCampaignInviteUrl, buildCampaignShareText, markInviteCopied } from '@/lib/playlistCommunities/invite'
import { t, useLang } from '@/lib/i18n'

type Props = {
  campaignId: string
  campaignTitle: string
  playlistTitle?: string | null
  referralCode?: string | null
  onCopied?: () => void
}

export default function CampaignInvitePanel({ campaignId, campaignTitle, playlistTitle, referralCode, onCopied }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [copied, setCopied] = useState<'link' | 'text' | null>(null)
  const inviteUrl = fullCampaignInviteUrl(campaignId, referralCode)

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    markInviteCopied(campaignId)
    setCopied('link')
    onCopied?.()
    window.setTimeout(() => setCopied(null), 2000)
  }

  const copyShareText = async () => {
    const text = buildCampaignShareText({ campaignTitle, playlistTitle, inviteUrl, tx })
    await navigator.clipboard.writeText(text)
    markInviteCopied(campaignId)
    setCopied('text')
    onCopied?.()
    window.setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="playlist-invite-panel card">
      <h3 className="playlist-invite-panel__title">{tx.playlistInviteCreatorsTitle}</h3>
      <p className="playlist-invite-panel__desc">{tx.playlistInviteCreatorsDesc}</p>
      <p className="playlist-invite-panel__url" title={inviteUrl}>{inviteUrl}</p>
      <div className="playlist-invite-panel__actions">
        <button type="button" className="btn-gold" onClick={copyLink}>
          {copied === 'link' ? tx.copied : tx.playlistCommunityCopyInvite}
        </button>
        <button type="button" className="btn-outline" onClick={copyShareText}>
          {copied === 'text' ? tx.copied : tx.playlistInviteCopyShareText}
        </button>
      </div>
      {referralCode && (
        <p className="playlist-invite-panel__ref">{tx.playlistInviteReferralNote}</p>
      )}
    </div>
  )
}
