export const V2_ROUTES = {
  home: '/community',
  circles: '/community/circles',
  circle: (slug: string) => `/community/circles/${slug}`,
  sessions: '/community/sessions',
  session: (id: string) => `/community/sessions/${id}`,
  artists: '/community/artists',
  artist: (slug: string) => `/community/artists/${slug}`,
  songs: '/community/songs',
  song: (id: string) => `/community/songs/${id}`,
  playlists: '/community/playlists',
  pricing: '/community/pricing',
  submit: '/community#submit',
} as const

export function isV2CommunityRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/community' || pathname.startsWith('/community/')
}
