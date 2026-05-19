import { buildCampaignInviteUrl } from './serialize'

export function fullCampaignInviteUrl(campaignId: string, referralCode?: string | null) {
  const path = buildCampaignInviteUrl(campaignId, referralCode)
  if (typeof window !== 'undefined' && !path.startsWith('http')) {
    return `${window.location.origin}${path}`
  }
  return path
}

export function buildCampaignShareText(params: {
  campaignTitle: string
  playlistTitle?: string | null
  inviteUrl: string
  tx: Record<string, string>
}) {
  const { campaignTitle, playlistTitle, inviteUrl, tx } = params
  const template = tx.playlistInviteShareTemplate || ''
  return template
    .replace('{title}', campaignTitle)
    .replace('{playlist}', playlistTitle || '')
    .replace('{url}', inviteUrl)
    .trim()
}

const INVITE_COPIED_KEY = 'viatone_campaign_invite_copied'

export function markInviteCopied(campaignId: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(INVITE_COPIED_KEY)
    const set = new Set<string>(raw ? JSON.parse(raw) : [])
    set.add(campaignId)
    localStorage.setItem(INVITE_COPIED_KEY, JSON.stringify(Array.from(set)))
  } catch {
    /* ignore */
  }
}

export function hasCopiedAnyCampaignInvite(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(INVITE_COPIED_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    return list.length > 0
  } catch {
    return false
  }
}

export function wasInviteCopied(campaignId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(INVITE_COPIED_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    return list.includes(campaignId)
  } catch {
    return false
  }
}
