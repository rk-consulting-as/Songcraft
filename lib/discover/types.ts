import type { DiscoverCreatorCardData } from '@/lib/creatorIdentity/types'

export type DiscoverRelease = {
  id: string
  title: string
  artistId: string
  artistName: string
  artistSlug: string | null
  coverUrl: string | null
  releaseDate: string | null
  createdAt: string
  href: string
  trendingScore: number
  featuredOnViaTone: boolean
}

export type DiscoverEpk = {
  artistId: string
  artistName: string
  artistSlug: string
  imageUrl: string | null
  genre: string | null
  href: string
}

export type DiscoverGenreChip = {
  genre: string
  count: number
}

export type DiscoverPlaylistCampaign = {
  id: string
  title: string
  description: string | null
  rules: string | null
  genre: string | null
  mood: string | null
  commitmentLevel: string
  status: string
  memberCount: number
  playlistTitle: string
  playlistImageUrl: string | null
  artistName: string | null
  href: string
  createdAt: string
}

export type DiscoverCatalog = {
  trending: DiscoverCreatorCardData[]
  newReleases: DiscoverRelease[]
  featured: DiscoverCreatorCardData[]
  spotlight: DiscoverCreatorCardData[]
  recentlyActive: DiscoverCreatorCardData[]
  genres: DiscoverGenreChip[]
  epks: DiscoverEpk[]
  playlistCampaigns: DiscoverPlaylistCampaign[]
  generatedAt: string
}

export type DiscoverFilter = 'trending' | 'newest' | 'active' | 'genre'
