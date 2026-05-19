import type { CampaignHealthInput } from './health'

export type QualityCheckItem = {
  id: string
  labelKey: string
  done: boolean
  optional?: boolean
}

export function buildCampaignQualityChecklist(
  input: CampaignHealthInput & { inviteCopied?: boolean }
): QualityCheckItem[] {
  const { campaign, members } = input
  const approved = members.filter(m => m.status === 'approved')
  const withSong = approved.filter(m => m.song_id)

  return [
    {
      id: 'playlist',
      labelKey: 'playlistQualityPlaylist',
      done: !!(campaign.playlist?.spotify_url?.trim() || campaign.playlist?.title),
    },
    {
      id: 'rules',
      labelKey: 'playlistQualityRules',
      done: !!(campaign.rules?.trim() && campaign.rules.trim().length > 15),
    },
    {
      id: 'genre_mood',
      labelKey: 'playlistQualityGenreMood',
      done: !!(campaign.genre?.trim() || campaign.mood?.trim()),
    },
    {
      id: 'dates',
      labelKey: 'playlistQualityDates',
      done: !!(campaign.campaign_start_date || campaign.campaign_end_date),
      optional: true,
    },
    {
      id: 'members',
      labelKey: 'playlistQualityMembers',
      done: approved.length >= 3,
    },
    {
      id: 'songs',
      labelKey: 'playlistQualitySongs',
      done: withSong.length >= 1,
    },
    {
      id: 'invite',
      labelKey: 'playlistQualityInvite',
      done: !!input.inviteCopied,
      optional: true,
    },
  ]
}

export function qualityScore(items: QualityCheckItem[]): number {
  const required = items.filter(i => !i.optional)
  if (!required.length) return 100
  const done = required.filter(i => i.done).length
  return Math.round((done / required.length) * 100)
}
