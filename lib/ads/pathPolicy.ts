/** Path prefixes where ads must never render (critical flows, embeds, billing). */
const AD_EXCLUDED_PREFIXES = [
  '/epk/',
  '/embed/',
  '/admin',
  '/settings/billing',
  '/playlist-campaigns/',
  '/discover/campaigns',
] as const

export function isPathAdsAllowed(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/'
  return !AD_EXCLUDED_PREFIXES.some(prefix => path === prefix.replace(/\/$/, '') || path.startsWith(prefix))
}
