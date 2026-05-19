import type { CampaignCardData, PublicCampaignMember } from './types'

export function buildCampaignInviteUrl(campaignId: string, referralCode?: string | null) {
  if (typeof window !== 'undefined') {
    const base = `${window.location.origin}/playlist-campaigns/${campaignId}`
    return referralCode ? `${base}?ref=${encodeURIComponent(referralCode)}` : base
  }
  const base = `/playlist-campaigns/${campaignId}`
  return referralCode ? `${base}?ref=${encodeURIComponent(referralCode)}` : base
}

export function rulesSummary(rules: string | null | undefined, max = 120) {
  if (!rules?.trim()) return null
  const t = rules.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function sanitizePublicMember(row: {
  id: string
  status: string
  joined_at: string
  artist?: { name?: string; page_slug?: string | null } | null
  song?: { id?: string; title?: string; public_hidden?: boolean } | null
}): PublicCampaignMember | null {
  if (row.status !== 'approved' && row.status !== 'requested') return null
  const songPublic = row.song && row.song.public_hidden === false
  return {
    id: row.id,
    status: row.status as PublicCampaignMember['status'],
    artistName: row.artist?.name || null,
    artistSlug: row.artist?.page_slug || null,
    songTitle: songPublic ? row.song?.title || null : null,
    songHref: songPublic && row.song?.id ? `/s/${row.song.id}` : null,
    joinedAt: row.joined_at,
  }
}

export type CampaignRow = CampaignCardData & Record<string, unknown>
