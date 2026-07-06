import type {
  V2Artist,
  V2Circle,
  V2CommunityStats,
  V2PlaylistRoom,
  V2PricingPlan,
  V2Session,
  V2Song,
  V2Supporter,
} from './types'

const IMG = {
  studio: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1800&q=80',
  country: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80',
  metal: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  indie: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80',
  release: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80',
  artist: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80',
  session2: 'https://images.unsplash.com/photo-1520166012956-add9ba0835cb?auto=format&fit=crop&w=700&q=80',
}

export const V2_COMMUNITY_STATS: V2CommunityStats = {
  membersStreamingNow: 14,
  sessionsTonight: 3,
  songsSubmitted: 128,
  communityListeningHours: 42,
  feedbackCompletionPercent: 91,
}

export const V2_CIRCLES: V2Circle[] = [
  {
    id: 'circle-dark-country',
    slug: 'dark-country-circle',
    name: 'Dark Country Circle',
    description: 'For outlaw country, cinematic western rock and gritty storytelling.',
    coverImageUrl: IMG.country,
    tags: ['Country', 'Dark', 'Storytelling'],
    creationTypes: ['human', 'ai_assisted'],
    platforms: ['spotify'],
    memberCount: 84,
    sessionCount: 6,
    visibility: 'public',
    featured: true,
  },
  {
    id: 'circle-ai-metal',
    slug: 'ai-metal-lab',
    name: 'AI Metal Lab',
    description: 'For AI metal, hybrid production, heavy prompts and feedback.',
    coverImageUrl: IMG.metal,
    tags: ['Metal', 'AI', 'Feedback'],
    creationTypes: ['fully_ai', 'hybrid'],
    platforms: ['youtube', 'spotify'],
    memberCount: 62,
    sessionCount: 4,
    visibility: 'public',
    featured: true,
  },
  {
    id: 'circle-nordic-indie',
    slug: 'nordic-indie-discovery',
    name: 'Nordic Indie Discovery',
    description: 'For nordic artists, soft releases and Tidal/Spotify discovery.',
    coverImageUrl: IMG.indie,
    tags: ['Indie', 'Nordic', 'Discovery'],
    creationTypes: ['human'],
    platforms: ['tidal', 'spotify'],
    memberCount: 51,
    sessionCount: 3,
    visibility: 'public',
    featured: true,
  },
  {
    id: 'circle-release-support',
    slug: 'release-support-room',
    name: 'Release Support Room',
    description: 'Submit one song, join sessions, give feedback and build momentum.',
    coverImageUrl: IMG.release,
    tags: ['Release', 'Playlist', 'Support'],
    creationTypes: ['human', 'hybrid', 'ai_assisted'],
    platforms: ['mixed'],
    memberCount: 120,
    sessionCount: 8,
    visibility: 'public',
    featured: true,
  },
  {
    id: 'circle-feedback',
    slug: 'song-feedback-circle',
    name: 'Song Feedback Circle',
    description: 'Structured feedback on production, chorus and overall vibe.',
    coverImageUrl: IMG.studio,
    tags: ['Feedback', 'Production'],
    creationTypes: ['human', 'ai_assisted', 'fully_ai'],
    platforms: ['mixed'],
    memberCount: 45,
    sessionCount: 2,
    visibility: 'public',
  },
]

export const V2_SESSIONS: V2Session[] = [
  {
    id: 'friday-dark-country',
    title: 'Friday Dark Country Stream',
    hostName: 'Rune',
    circleSlug: 'dark-country-circle',
    circleName: 'Dark Country Circle',
    status: 'upcoming',
    startsAt: new Date(Date.now() + 24 * 60 * 1000).toISOString(),
    platform: 'spotify',
    coverImageUrl: IMG.studio,
    trackCount: 22,
    artistCount: 14,
    joinedCount: 12,
    feedbackPending: 7,
    features: ['Auto-Switch', 'Proof log'],
    creationTypes: ['hybrid', 'human'],
    queue: [
      { position: 1, title: "We Don't Burn", artistName: 'Hellwater Saints', duration: '3:58', isNowPlaying: true },
      { position: 2, title: 'Midnight Mercy', artistName: 'Hellwater Saints', duration: '4:14' },
      { position: 3, title: 'Black River Choir', artistName: 'Community Pick', duration: '3:42' },
    ],
  },
  {
    id: 'ai-metal-feedback-night',
    title: 'AI Metal Feedback Night',
    hostName: 'Metal Lab',
    circleSlug: 'ai-metal-lab',
    circleName: 'AI Metal Lab',
    status: 'upcoming',
    startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    platform: 'youtube',
    coverImageUrl: IMG.session2,
    trackCount: 16,
    artistCount: 11,
    joinedCount: 8,
    seatsOpen: 4,
    features: ['Comments required', 'Feedback'],
    creationTypes: ['fully_ai'],
    queue: [
      { position: 1, title: 'Steel Cathedral', artistName: 'Nordfire', duration: '4:28', isNowPlaying: true },
      { position: 2, title: 'Ghost Circuit', artistName: 'Syntralis', duration: '3:55' },
      { position: 3, title: 'Machine Psalm', artistName: 'Community Pick', duration: '4:01' },
    ],
  },
  {
    id: 'tidal-discovery-hour',
    title: 'Tidal Discovery Hour',
    hostName: 'Nordic Indie',
    circleSlug: 'nordic-indie-discovery',
    circleName: 'Nordic Indie Discovery',
    status: 'ended',
    startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    platform: 'tidal',
    coverImageUrl: IMG.indie,
    trackCount: 18,
    artistCount: 9,
    joinedCount: 22,
    features: ['HiFi rotation'],
    creationTypes: ['human'],
    queue: [],
  },
]

export const V2_ARTISTS: V2Artist[] = [
  {
    id: 'artist-hellwater',
    slug: 'hellwater-saints',
    name: 'Hellwater Saints',
    bio: 'Dark outlaw country from the edge of the storm. Gritty vocals, cinematic tension and community-driven releases.',
    genre: 'Dark outlaw country',
    coverImageUrl: IMG.artist,
    avatarInitial: 'H',
    creationType: 'hybrid',
    songCount: 12,
    circleCount: 3,
    platforms: ['spotify', 'youtube', 'tidal'],
    publicPageSlug: 'hellwater-saints',
  },
  {
    id: 'artist-nordfire',
    slug: 'nordfire',
    name: 'Nordfire',
    bio: 'AI-assisted metal with human arrangement and community feedback loops.',
    genre: 'AI Metal',
    coverImageUrl: IMG.metal,
    avatarInitial: 'N',
    creationType: 'fully_ai',
    songCount: 8,
    circleCount: 2,
    platforms: ['youtube', 'spotify'],
  },
  {
    id: 'artist-syntralis',
    slug: 'syntralis',
    name: 'Syntralis',
    bio: 'Hybrid electronic metal — machine hymns and human grief.',
    genre: 'Hybrid Metal',
    coverImageUrl: IMG.session2,
    avatarInitial: 'S',
    creationType: 'ai_assisted',
    songCount: 5,
    circleCount: 1,
    platforms: ['spotify'],
  },
]

export const V2_SONGS: V2Song[] = [
  {
    id: 'song-we-dont-burn',
    title: "We Don't Burn",
    artistSlug: 'hellwater-saints',
    artistName: 'Hellwater Saints',
    coverImageUrl: IMG.artist,
    creationType: 'hybrid',
    releaseStatus: 'released',
    platforms: { spotify: 'https://open.spotify.com/track/example', youtube: 'https://youtube.com/watch?v=example' },
    pitch: 'Outlaw anthem with slow-burn tension and explosive chorus.',
  },
  {
    id: 'song-midnight-mercy',
    title: 'Midnight Mercy',
    artistSlug: 'hellwater-saints',
    artistName: 'Hellwater Saints',
    coverImageUrl: IMG.artist,
    creationType: 'hybrid',
    releaseStatus: 'released',
    platforms: { spotify: 'https://open.spotify.com/track/example2' },
  },
  {
    id: 'song-steel-cathedral',
    title: 'Steel Cathedral',
    artistSlug: 'nordfire',
    artistName: 'Nordfire',
    coverImageUrl: IMG.metal,
    creationType: 'fully_ai',
    releaseStatus: 'released',
    needsFeedback: true,
    platforms: { youtube: 'https://youtube.com/watch?v=example3' },
  },
  {
    id: 'song-paid-in-full',
    title: 'Paid in Full',
    artistSlug: 'hellwater-saints',
    artistName: 'Hellwater Saints',
    coverImageUrl: IMG.country,
    creationType: 'human',
    releaseStatus: 'needs_links',
    needsFeedback: true,
    platforms: {},
    pitch: 'Needs YouTube link before session submission.',
  },
]

export const V2_PLAYLISTS: V2PlaylistRoom[] = [
  {
    id: 'pl-weekly-support',
    slug: 'weekly-support',
    name: 'Weekly Support Playlist',
    description: 'Rotation of community picks with proof logging.',
    coverImageUrl: IMG.release,
    trackCount: 34,
    circleSlug: 'release-support-room',
    platform: 'spotify',
  },
  {
    id: 'pl-friday-discoveries',
    slug: 'friday-discoveries',
    name: 'Friday Discoveries',
    description: 'New releases from active circle members.',
    coverImageUrl: IMG.studio,
    trackCount: 22,
    circleSlug: 'dark-country-circle',
    platform: 'spotify',
  },
]

export const V2_SUPPORTERS: V2Supporter[] = [
  { id: 's1', name: 'Aurora K.', score: 920, badge: 'Trusted host' },
  { id: 's2', name: 'Magnus T.', score: 880, badge: 'Top curator' },
  { id: 's3', name: 'Elena R.', score: 810, badge: 'Feedback giver' },
]

export const V2_PRICING: V2PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    priceLabel: '0 /mo',
    description: 'Join the community and get started.',
    features: ['1 artist', '5 songs', 'Join Circles', 'Join Sessions', 'Basic artist page'],
    cta: 'Start free',
  },
  {
    id: 'pro_artist',
    name: 'Pro Artist',
    priceLabel: '99 kr /mo',
    description: 'Look professional and get more from the community.',
    features: ['Unlimited songs', 'Premium artist pages', 'More submissions', 'Analytics + QR tracking', 'AI content helpers'],
    featured: true,
    cta: 'Upgrade artist',
  },
  {
    id: 'host_pro',
    name: 'Host Pro',
    priceLabel: '149 kr /mo',
    description: 'For curators and streamers who drive Circles and Sessions.',
    features: ['Create Circles', 'Host Sessions', 'Stream Engine automation', 'Reports + proof logs', 'Moderation tools'],
    cta: 'Become host',
  },
]

export function getCircleBySlug(slug: string): V2Circle | undefined {
  return V2_CIRCLES.find(c => c.slug === slug)
}

export function getSessionById(id: string): V2Session | undefined {
  return V2_SESSIONS.find(s => s.id === id)
}

export function getArtistBySlug(slug: string): V2Artist | undefined {
  return V2_ARTISTS.find(a => a.slug === slug)
}

export function getSongById(id: string): V2Song | undefined {
  return V2_SONGS.find(s => s.id === id)
}

export function getSessionsForCircle(circleSlug: string): V2Session[] {
  return V2_SESSIONS.filter(s => s.circleSlug === circleSlug)
}

export function getSongsForCircle(circleSlug: string): V2Song[] {
  if (circleSlug === 'dark-country-circle') {
    return V2_SONGS.filter(s => s.artistSlug === 'hellwater-saints')
  }
  if (circleSlug === 'ai-metal-lab') {
    return V2_SONGS.filter(s => s.artistSlug === 'nordfire' || s.artistSlug === 'syntralis')
  }
  return V2_SONGS.slice(0, 3)
}

export function formatSessionBadge(session: V2Session): string {
  if (session.status === 'live') return 'LIVE'
  if (session.status === 'ended') return 'ENDED'
  const diff = new Date(session.startsAt).getTime() - Date.now()
  if (diff <= 0) return 'STARTING'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `LIVE IN ${mins} MIN`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
