export function slugifyStoryTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'story'
}

export function uniqueStorySlug(base: string, existing: string[]): string {
  const slug = slugifyStoryTitle(base)
  if (!existing.includes(slug)) return slug
  let i = 2
  while (existing.includes(`${slug}-${i}`)) i += 1
  return `${slug}-${i}`
}
