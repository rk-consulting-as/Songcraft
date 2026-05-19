export type PlaylistVisibility = 'private' | 'public' | 'unlisted'

export type CampaignStatus = 'draft' | 'open' | 'active' | 'closed' | 'archived'

export type CampaignVisibility = 'private' | 'public' | 'unlisted'

export type CommitmentLevel = 'flexible' | 'standard' | 'dedicated'

export type MemberStatus = 'requested' | 'approved' | 'rejected' | 'left' | 'removed'

export type CreatorPlaylist = {
  id: string
  user_id: string
  artist_id: string | null
  spotify_playlist_id: string | null
  title: string
  description: string | null
  spotify_url: string
  image_url: string | null
  owner_name: string | null
  genre: string | null
  mood: string | null
  visibility: PlaylistVisibility
  admin_hidden: boolean
  created_at: string
  updated_at: string
}

export type PlaylistCampaign = {
  id: string
  user_id: string
  artist_id: string | null
  playlist_id: string
  title: string
  description: string | null
  rules: string | null
  genre: string | null
  mood: string | null
  commitment_level: CommitmentLevel
  max_members: number | null
  songs_per_member: number
  active_days_per_week: number | null
  campaign_start_date: string | null
  campaign_end_date: string | null
  status: CampaignStatus
  visibility: CampaignVisibility
  admin_hidden: boolean
  created_at: string
  updated_at: string
}

export type PlaylistCampaignMember = {
  id: string
  campaign_id: string
  user_id: string
  artist_id: string | null
  song_id: string | null
  status: MemberStatus
  message: string | null
  joined_at: string
  updated_at: string
}

export type CampaignCardData = PlaylistCampaign & {
  playlist?: Pick<CreatorPlaylist, 'title' | 'image_url' | 'spotify_url' | 'owner_name'>
  memberCount?: number
  approvedCount?: number
  pendingCount?: number
  pendingProofCount?: number
  approvedThisWeek?: number
  membersNeedingAttention?: number
  artistName?: string | null
  isOwner?: boolean
  myMembership?: Pick<PlaylistCampaignMember, 'id' | 'status'> | null
}

export type PublicCampaignMember = {
  id: string
  status: MemberStatus
  artistName: string | null
  artistSlug: string | null
  songTitle: string | null
  songHref: string | null
  joinedAt: string
}

export type DiscoverPlaylistCampaign = {
  id: string
  title: string
  description: string | null
  genre: string | null
  mood: string | null
  commitmentLevel: CommitmentLevel
  status: CampaignStatus
  memberCount: number
  playlistTitle: string
  playlistImageUrl: string | null
  artistName: string | null
  href: string
  createdAt: string
}
