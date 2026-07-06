export const V2_ROUTES = {
  home: '/community',
  legacyStudio: '/dashboard',
  circles: '/community/circles',
  circle: (slug: string) => `/community/circles/${slug}`,
  sessions: '/community/sessions',
  session: (id: string) => `/community/sessions/${id}`,
  artists: '/community/artists',
  artist: (slug: string) => `/community/artists/${slug}`,
  songs: '/community/songs',
  song: (id: string) => `/community/songs/${id}`,
  playlists: '/community/playlists',
  playlistRoom: (slug: string) => `/community/playlists/${slug}`,
  pricing: '/community/pricing',
  submit: '/community#submit',
} as const

/** Default landing route after login / completed onboarding. */
export const V2_DEFAULT_LANDING = V2_ROUTES.home

export function isV2CommunityRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/community' || pathname.startsWith('/community/')
}
