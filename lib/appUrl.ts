/** Canonical app origin for server metadata, emails, and OG tags. Never hardcodes legacy hostnames. */
export function resolveServerAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (explicit) return explicit
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`
  return ''
}

export function absoluteAppUrl(path: string, base?: string): string {
  const origin = (base || resolveServerAppUrl()).replace(/\/$/, '')
  if (!path) return origin
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return origin ? `${origin}${normalized}` : normalized
}

/** Browser-only public URL for a path (uses window.location.origin). */
export function clientPublicUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined') return `${window.location.origin}${normalized}`
  return absoluteAppUrl(normalized)
}
