export type PlaylistReputationBadgeId =
  | 'reliable_collaborator'
  | 'community_builder'
  | 'playlist_starter'
  | 'campaign_host'
  | 'growth_partner'

export type PlaylistReputationBadge = {
  id: PlaylistReputationBadgeId
  labelKey: string
  icon: string
  earned: boolean
  placeholder?: boolean
}

export type PlaylistReputationInput = {
  playlistCount: number
  ownedCampaignCount: number
  joinedCampaignCount: number
  approvedMembershipCount: number
  hostedApprovedMemberCount: number
}

export function computePlaylistReputation(input: PlaylistReputationInput): PlaylistReputationBadge[] {
  const {
    playlistCount,
    ownedCampaignCount,
    joinedCampaignCount,
    approvedMembershipCount,
    hostedApprovedMemberCount,
  } = input

  return [
    {
      id: 'playlist_starter',
      labelKey: 'playlistBadgeStarter',
      icon: '♫',
      earned: playlistCount >= 1,
    },
    {
      id: 'campaign_host',
      labelKey: 'playlistBadgeHost',
      icon: '🎧',
      earned: ownedCampaignCount >= 1,
    },
    {
      id: 'community_builder',
      labelKey: 'playlistBadgeBuilder',
      icon: '🤝',
      earned: hostedApprovedMemberCount >= 3 || joinedCampaignCount >= 2,
    },
    {
      id: 'growth_partner',
      labelKey: 'playlistBadgeGrowth',
      icon: '↗',
      earned: ownedCampaignCount >= 1 && joinedCampaignCount >= 1,
    },
    {
      id: 'reliable_collaborator',
      labelKey: 'playlistBadgeReliable',
      icon: '✓',
      earned: approvedMembershipCount >= 2,
      placeholder: true,
    },
  ]
}
