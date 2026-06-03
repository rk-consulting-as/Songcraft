/** Public EPK URL uses artist `page_slug` (not a separate epk_slug). */
export function epkPublicPath(pageSlug: string | null | undefined): string | null {
  const slug = pageSlug?.trim()
  if (!slug) return null
  return `/epk/${slug}`
}

/** Draft preview for workspace editors — bypasses publish gates on the EPK route. */
export function epkPreviewPath(pageSlug: string | null | undefined): string | null {
  const base = epkPublicPath(pageSlug)
  if (!base) return null
  return `${base}?preview=1`
}

export function isEpkPreviewMode(searchParams: { preview?: string } | undefined): boolean {
  return searchParams?.preview === '1'
}
