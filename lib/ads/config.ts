export type AdPlacement =
  | 'artist_mid'
  | 'artist_footer'
  | 'song_footer'
  | 'discover_between'
  | 'dashboard_card'

/** Global ads master switch (NEXT_PUBLIC_ADS_ENABLED=true). */
export function isAdsGloballyEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'
}

export function getAdsenseClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim()
  return id || null
}

const PLACEMENT_SLOT_ENV: Partial<Record<AdPlacement, string>> = {
  artist_mid: 'NEXT_PUBLIC_ADSENSE_SLOT_ARTIST_MID',
  artist_footer: 'NEXT_PUBLIC_ADSENSE_SLOT_ARTIST_FOOTER',
  song_footer: 'NEXT_PUBLIC_ADSENSE_SLOT_SONG_FOOTER',
  discover_between: 'NEXT_PUBLIC_ADSENSE_SLOT_DISCOVER',
  dashboard_card: 'NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD',
}

/** AdSense ad unit slot id for a placement (falls back to NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT). */
export function getAdSlotId(placement: AdPlacement): string | null {
  const key = PLACEMENT_SLOT_ENV[placement]
  const specific = key ? process.env[key as keyof NodeJS.ProcessEnv]?.trim() : ''
  const fallback = process.env.NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT?.trim()
  return specific || fallback || null
}
