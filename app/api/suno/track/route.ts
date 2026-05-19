import { NextRequest, NextResponse } from 'next/server'

// GET /api/suno/track?url=<suno song URL>
//
// Accepted URL forms:
//   - https://suno.com/song/{uuid}
//   - https://suno.com/s/{shortcode}      (share link, redirects to /song/{uuid})
//   - https://app.suno.ai/song/{uuid}     (legacy)
//   - bare uuid (treated as /song/{uuid})
//
// Returns: { id, title, coverUrl, audioUrl, description, tags, lyrics, sunoUrl } or { error }
//
// Strategy: fetch the public song page server-side, parse OpenGraph tags and (where available)
// the embedded `__NEXT_DATA__` JSON for richer metadata. Falls back gracefully if any source
// is missing — Suno can change their page structure, so each parser is best-effort.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeSunoUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  // Bare UUID
  if (UUID_RE.test(raw)) return `https://suno.com/song/${raw}`

  try {
    const url = new URL(raw.startsWith('http') ? raw : 'https://' + raw)
    const host = url.hostname.toLowerCase()
    if (!/(^|\.)suno\.com$|(^|\.)suno\.ai$/.test(host)) return null
    // Force https + canonical host (suno.com)
    url.protocol = 'https:'
    url.hostname = 'suno.com'
    // Drop tracking params that bloat the URL
    url.searchParams.delete('si')
    url.searchParams.delete('utm_source')
    url.searchParams.delete('utm_medium')
    url.searchParams.delete('utm_campaign')
    return url.toString()
  } catch {
    return null
  }
}

/** Match a meta tag with property/name = `key` and read its content. */
function metaTag(html: string, key: string): string {
  // <meta property="og:title" content="...">
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i')
  return (html.match(re1)?.[1] || html.match(re2)?.[1] || '').trim()
}

/** Extract __NEXT_DATA__ JSON if present. */
function nextData(html: string): any {
  const m = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

/** Extract first JSON-LD block (often MusicRecording schema for songs). */
function jsonLd(html: string): any {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1])
      if (Array.isArray(parsed)) {
        const rec = parsed.find(p => p?.['@type'] === 'MusicRecording' || p?.['@type'] === 'AudioObject')
        if (rec) return rec
      } else if (parsed?.['@type'] === 'MusicRecording' || parsed?.['@type'] === 'AudioObject') {
        return parsed
      }
    } catch { /* skip */ }
  }
  return null
}

/** Walk an object tree and find the first value matching the predicate. */
function findInTree(obj: any, predicate: (k: string, v: any) => boolean, depth = 0): any {
  if (depth > 8 || obj == null) return undefined
  if (typeof obj !== 'object') return undefined
  for (const k of Object.keys(obj)) {
    const v = obj[k]
    if (predicate(k, v)) return v
    const found = findInTree(v, predicate, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('url') || ''
  const sunoUrl = normalizeSunoUrl(input)
  if (!sunoUrl) {
    return NextResponse.json({ error: 'Could not parse a Suno URL from the input.' }, { status: 400 })
  }

  let html = ''
  try {
    const res = await fetch(sunoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ViaTone/1.0; +https://songcraft-lilac.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Suno responded ${res.status} — track may be private or removed` },
        { status: res.status === 404 ? 404 : 502 }
      )
    }
    html = await res.text()
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch Suno page' }, { status: 502 })
  }

  // Try OpenGraph first — most reliable, present on virtually every page.
  const ogTitle = metaTag(html, 'og:title')
  const ogImage = metaTag(html, 'og:image')
  const ogAudio = metaTag(html, 'og:audio') || metaTag(html, 'og:audio:secure_url')
  const ogDescription = metaTag(html, 'og:description')

  // Try JSON-LD for cleaner metadata where available.
  const ld = jsonLd(html)
  const ldName = ld?.name || ld?.headline
  const ldImage = typeof ld?.image === 'string' ? ld.image : ld?.image?.url
  const ldAudio = typeof ld?.audio === 'string' ? ld.audio : ld?.audio?.contentUrl || ld?.contentUrl
  const ldDescription = ld?.description

  // Try __NEXT_DATA__ for the richest data (lyrics, tags, etc.) — Suno's page likely embeds this.
  const nd = nextData(html)
  const ndAudio = nd ? findInTree(nd, (k, v) =>
    typeof v === 'string' && /\.(mp3|wav|m4a|ogg)(\?|$)/i.test(v) && /audio_url|stream|mp3|file|cdn/i.test(k)
  ) as string | undefined : undefined
  const ndImage = nd ? findInTree(nd, (k, v) =>
    typeof v === 'string' && /\.(jpe?g|png|webp)(\?|$)/i.test(v) && /image_url|cover|art|thumbnail/i.test(k)
  ) as string | undefined : undefined
  const ndLyrics = nd ? findInTree(nd, (k, v) =>
    typeof v === 'string' && v.length > 40 && /lyric|prompt_text|gpt_description_prompt/i.test(k)
  ) as string | undefined : undefined
  const ndTags = nd ? findInTree(nd, (k, v) =>
    typeof v === 'string' && v.length > 0 && v.length < 500 && /tags|metadata\.tags|style/i.test(k)
  ) as string | undefined : undefined

  // Pull track ID from the canonical URL.
  let trackId: string | undefined
  try {
    const u = new URL(sunoUrl)
    const segs = u.pathname.split('/').filter(Boolean)
    const songIdx = segs.indexOf('song')
    if (songIdx >= 0 && segs[songIdx + 1]) trackId = segs[songIdx + 1]
  } catch { /* ignore */ }

  return NextResponse.json({
    id: trackId || null,
    sunoUrl,
    title: ldName || ogTitle || null,
    coverUrl: ldImage || ogImage || ndImage || null,
    audioUrl: ldAudio || ogAudio || ndAudio || null,
    description: ldDescription || ogDescription || null,
    tags: ndTags || null,
    lyrics: ndLyrics || null,
  })
}
