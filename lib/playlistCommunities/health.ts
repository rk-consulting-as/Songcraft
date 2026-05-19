import type { CampaignStatus, PlaylistCampaign } from './types'

export type CampaignHealthSignal =
  | 'status_draft'
  | 'status_open'
  | 'status_active'
  | 'status_closed'
  | 'status_archived'
  | 'capacity_ok'
  | 'capacity_nearly_full'
  | 'capacity_full'
  | 'capacity_empty'
  | 'members_inactive'
  | 'members_active'
  | 'songs_missing_links'
  | 'songs_links_ok'
  | 'ready_to_launch'
  | 'needs_setup'

export type MemberWithSong = {
  id: string
  status: string
  song_id?: string | null
  songTitle?: string | null
  songSpotifyUrl?: string | null
  songHref?: string | null
}

export type CampaignHealthInput = {
  campaign: Pick<
    PlaylistCampaign,
    | 'status'
    | 'max_members'
    | 'rules'
    | 'genre'
    | 'mood'
    | 'campaign_start_date'
    | 'campaign_end_date'
    | 'visibility'
  > & {
    memberCount?: number
    approvedCount?: number
    pendingCount?: number
    playlist?: { spotify_url?: string | null; title?: string } | null
  }
  members: MemberWithSong[]
}

export function computeCampaignHealth(input: CampaignHealthInput): CampaignHealthSignal[] {
  const { campaign, members } = input
  const signals: CampaignHealthSignal[] = []
  const status = campaign.status as CampaignStatus

  signals.push(`status_${status}` as CampaignHealthSignal)

  const activeMembers = members.filter(m => ['requested', 'approved'].includes(m.status))
  const approved = members.filter(m => m.status === 'approved')

  if (campaign.max_members != null) {
    const used = activeMembers.length
    if (used >= campaign.max_members) signals.push('capacity_full')
    else if (used >= Math.max(1, campaign.max_members - 2)) signals.push('capacity_nearly_full')
    else if (used === 0) signals.push('capacity_empty')
    else signals.push('capacity_ok')
  } else if (activeMembers.length === 0) {
    signals.push('capacity_empty')
  } else {
    signals.push('capacity_ok')
  }

  if (approved.length === 0 && status !== 'draft') {
    signals.push('members_inactive')
  } else if (approved.length > 0) {
    signals.push('members_active')
  }

  const withSong = approved.filter(m => m.song_id)
  const missingLinks = withSong.filter(m => !m.songSpotifyUrl)
  if (withSong.length > 0 && missingLinks.length > 0) {
    signals.push('songs_missing_links')
  } else if (withSong.length > 0) {
    signals.push('songs_links_ok')
  }

  const hasPlaylist = !!(campaign.playlist?.spotify_url?.trim())
  const hasRules = !!(campaign.rules?.trim() && campaign.rules.trim().length > 20)
  const hasGenreMood = !!(campaign.genre?.trim() || campaign.mood?.trim())
  const hasDates = !!(campaign.campaign_start_date || campaign.campaign_end_date)

  if (
    status === 'draft' &&
    hasPlaylist &&
    hasRules &&
    campaign.visibility === 'public'
  ) {
    signals.push('ready_to_launch')
  } else if (status === 'draft') {
    signals.push('needs_setup')
  }

  return signals
}

export function statusBadgeClass(status: CampaignStatus): string {
  switch (status) {
    case 'open':
      return 'playlist-status--open'
    case 'active':
      return 'playlist-status--active'
    case 'closed':
      return 'playlist-status--closed'
    case 'archived':
      return 'playlist-status--archived'
    default:
      return 'playlist-status--draft'
  }
}
