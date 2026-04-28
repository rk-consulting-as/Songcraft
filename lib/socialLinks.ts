// Parsers for social media URLs / handles.
// Accepts either a full URL or a bare @handle and returns a normalized record.

export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok' | 'website'

export type SocialLink = {
  url: string                       // canonical URL we link to
  handle?: string                   // @-style handle, when applicable
  channel_id?: string               // YouTube channel ID (UCxxx)
  custom?: string                   // YouTube custom URL (legacy /c/Name)
  user?: string                     // YouTube legacy /user/Name
}

export type SocialLinksMap = Partial<Record<SocialPlatform, SocialLink>>

/** Strip a leading @ and any wrapping whitespace. */
const cleanHandle = (s: string) => s.trim().replace(/^@/, '').replace(/\/+$/, '')

/**
 * Parse a YouTube URL or handle into a normalized SocialLink.
 * Returns null if the input doesn't look like YouTube.
 *
 * Accepts:
 *   - https://www.youtube.com/@HellwaterSaints
 *   - https://youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx
 *   - https://www.youtube.com/c/CustomName
 *   - https://www.youtube.com/user/Username
 *   - youtube.com/@handle
 *   - @HellwaterSaints  (bare handle)
 *   - HellwaterSaints   (bare handle, treated as @handle)
 */
export function parseYoutube(input: string): SocialLink | null {
  const raw = input.trim()
  if (!raw) return null

  // Bare @handle or bare name -> assume modern @handle URL.
  if (!/^https?:\/\//i.test(raw) && !/youtube\.com|youtu\.be/i.test(raw)) {
    const handle = cleanHandle(raw)
    if (!/^[A-Za-z0-9._-]{3,}$/.test(handle)) return null
    if (/^(http|www|youtu)/i.test(handle)) return null  // user is mid-typing a URL
    return { url: `https://www.youtube.com/@${handle}`, handle }
  }

  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : 'https://' + raw)
  } catch {
    return null
  }

  if (!/(^|\.)youtube\.com$/i.test(url.hostname) && !/^youtu\.be$/i.test(url.hostname)) {
    return null
  }

  const path = url.pathname.replace(/\/+$/, '')
  const segments = path.split('/').filter(Boolean)

  // /@handle
  if (segments[0]?.startsWith('@')) {
    const handle = segments[0].slice(1)
    return { url: `https://www.youtube.com/@${handle}`, handle }
  }
  // /channel/UCxxxxx
  if (segments[0] === 'channel' && segments[1]) {
    return { url: `https://www.youtube.com/channel/${segments[1]}`, channel_id: segments[1] }
  }
  // /c/CustomName
  if (segments[0] === 'c' && segments[1]) {
    return { url: `https://www.youtube.com/c/${segments[1]}`, custom: segments[1] }
  }
  // /user/Username
  if (segments[0] === 'user' && segments[1]) {
    return { url: `https://www.youtube.com/user/${segments[1]}`, user: segments[1] }
  }
  // Fallback: keep the URL as-is, no handle extracted.
  return { url: url.toString() }
}

/**
 * Parse an Instagram URL or handle into a normalized SocialLink.
 * Returns null if the input doesn't look like Instagram.
 *
 * Accepts:
 *   - https://www.instagram.com/hellwatersaints
 *   - https://instagram.com/hellwatersaints/
 *   - instagram.com/hellwatersaints
 *   - @hellwatersaints
 *   - hellwatersaints (bare handle)
 */
export function parseInstagram(input: string): SocialLink | null {
  const raw = input.trim()
  if (!raw) return null

  // Bare handle path.
  if (!/^https?:\/\//i.test(raw) && !/instagram\.com/i.test(raw)) {
    const handle = cleanHandle(raw)
    if (!/^[A-Za-z0-9._]{3,30}$/.test(handle)) return null
    if (/^(http|www|insta)/i.test(handle)) return null  // user is mid-typing a URL
    return { url: `https://www.instagram.com/${handle}`, handle }
  }

  let url: URL
  try {
    url = new URL(raw.startsWith('http') ? raw : 'https://' + raw)
  } catch {
    return null
  }
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null

  const segments = url.pathname.split('/').filter(Boolean)
  const handle = segments[0]
  if (!handle) return null
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return null

  return { url: `https://www.instagram.com/${handle}`, handle }
}

/** Pretty label for a SocialLink (handle when we have one, else hostname). */
export function socialLabel(link: SocialLink): string {
  if (link.handle) return '@' + link.handle
  if (link.channel_id) return link.channel_id
  if (link.custom) return link.custom
  if (link.user) return link.user
  try {
    return new URL(link.url).hostname.replace(/^www\./, '')
  } catch {
    return link.url
  }
}
