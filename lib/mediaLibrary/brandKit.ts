import type { BrandKit } from './types'

export function getBrandKit(pageSettings: Record<string, unknown> | null | undefined): BrandKit {
  const raw = (pageSettings as { brand_kit?: BrandKit })?.brand_kit
  return raw && typeof raw === 'object' ? raw : {}
}

export function mergeBrandKit(
  pageSettings: Record<string, unknown> | null | undefined,
  patch: Partial<BrandKit>
): Record<string, unknown> {
  const base = { ...(pageSettings || {}) }
  const current = getBrandKit(base)
  return {
    ...base,
    brand_kit: { ...current, ...patch },
  }
}
