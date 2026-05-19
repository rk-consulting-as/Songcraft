import type { MediaAsset, MediaAssetUsage } from './types'
import { patchMediaAsset } from './client'

export type MediaUsageFlag =
  | 'used_in_epk'
  | 'used_in_campaign'
  | 'used_in_public_page'
  | 'used_as_cover'
  | 'used_as_brand_kit'

/** Merge legacy + new usage keys when reading. */
export function normalizeUsage(usage: MediaAssetUsage | null | undefined): MediaAssetUsage {
  const u = { ...(usage || {}) }
  if (u.epk) u.used_in_epk = true
  if (u.campaign) u.used_in_campaign = true
  if (u.public_page) u.used_in_public_page = true
  if (u.brand_kit) u.used_as_brand_kit = true
  return u
}

export function mergeUsageFlags(
  current: MediaAssetUsage | null | undefined,
  flags: MediaUsageFlag[]
): MediaAssetUsage {
  const next = normalizeUsage(current)
  for (const flag of flags) {
    next[flag] = true
    if (flag === 'used_in_epk') next.epk = true
    if (flag === 'used_in_campaign') next.campaign = true
    if (flag === 'used_in_public_page') next.public_page = true
    if (flag === 'used_as_brand_kit') next.brand_kit = true
  }
  return next
}

export async function trackMediaUsage(
  assetId: string,
  flags: MediaUsageFlag[],
  opts?: { makePublic?: boolean; artistId?: string }
): Promise<MediaAsset | null> {
  const patch: Record<string, unknown> = { merge_usage_flags: flags }
  if (opts?.makePublic) patch.visibility = 'public'
  if (opts?.artistId) patch.artist_id = opts.artistId
  return patchMediaAsset(assetId, patch)
}
