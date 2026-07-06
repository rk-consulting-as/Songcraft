export function slugifyCommunityName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export function artistCommunitySlug(artist: {
  id: string
  name: string
  page_slug?: string | null
}): string {
  const fromPage = artist.page_slug?.trim()
  if (fromPage) return fromPage
  const base = slugifyCommunityName(artist.name) || 'artist'
  return `${base}-${artist.id.slice(0, 8)}`
}

export function artistSlugCandidates(slug: string): { pageSlug?: string; idPrefix?: string } {
  const trimmed = slug.trim().toLowerCase()
  const parts = trimmed.split('-')
  const last = parts[parts.length - 1]
  if (last && /^[0-9a-f]{8}$/i.test(last)) {
    return { pageSlug: trimmed, idPrefix: last }
  }
  return { pageSlug: trimmed }
}
