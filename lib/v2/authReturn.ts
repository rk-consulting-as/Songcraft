import { isV2CommunityRoute } from '@/lib/v2/routes'

const ALLOWED_PREFIXES = [
  '/community',
  '/dashboard',
  '/library',
  '/discover',
  '/playbook',
  '/onboarding',
  '/profile',
  '/settings',
  '/messages',
  '/playlist-campaigns',
]

/** Validate an internal post-auth return path. Rejects external URLs and unknown routes. */
export function sanitizeAuthReturnPath(next: string | null | undefined): string | null {
  if (!next || typeof next !== 'string') return null
  const trimmed = next.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.includes('://')) return null
  const path = trimmed.split('?')[0].split('#')[0]
  const allowed = ALLOWED_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
  if (!allowed) return null
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function buildLoginUrl(returnPath?: string | null): string {
  const safe = sanitizeAuthReturnPath(returnPath)
  if (!safe) return '/login'
  return `/login?next=${encodeURIComponent(safe)}`
}

export function buildSignupUrl(returnPath?: string | null): string {
  const safe = sanitizeAuthReturnPath(returnPath)
  if (!safe) return '/login?signup=1'
  return `/login?signup=1&next=${encodeURIComponent(safe)}`
}

export function isCommunityReturnPath(path: string | null | undefined): boolean {
  return isV2CommunityRoute(path ?? null)
}
