/** URL-safe kebab-case slug for public story routes. */
export function slugifyStoryTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'story'
}

export function normalizeStorySlug(slug: string): string {
  return slugifyStoryTitle(slug)
}

/** Variants for DB lookup (canonical hyphen + legacy underscore forms). */
export function storySlugLookupVariants(param: string): string[] {
  const raw = param.trim().toLowerCase()
  const canonical = normalizeStorySlug(raw)
  const out = new Set<string>()
  if (canonical) out.add(canonical)
  if (raw) out.add(raw)
  if (raw.includes('_')) out.add(raw.replace(/_/g, '-'))
  return Array.from(out)
}

export function uniqueStorySlug(base: string, existing: string[]): string {
  const slug = slugifyStoryTitle(base)
  if (!existing.includes(slug)) return slug
  let i = 2
  while (existing.includes(`${slug}-${i}`)) i += 1
  return `${slug}-${i}`
}
