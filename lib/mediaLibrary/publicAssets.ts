import type { MediaAsset } from './types'

/** Only assets explicitly marked public — never expose private URLs on public surfaces. */
export function filterPublicMediaAssets(assets: MediaAsset[]): MediaAsset[] {
  return assets.filter(a => a.visibility === 'public')
}

export function publicMediaUrl(asset: MediaAsset | null | undefined): string | null {
  if (!asset || asset.visibility !== 'public') return null
  return asset.file_url
}
