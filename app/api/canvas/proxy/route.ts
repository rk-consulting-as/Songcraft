import { NextRequest, NextResponse } from 'next/server'

// GET /api/canvas/proxy?url=<external video URL>
// Server-side fetch + stream of an external video file. Used when the browser can't fetch
// a generated video URL directly (CORS) before re-uploading to Supabase Storage.
//
// Security: only allow fal.run / fal.media / supabase.co / common CDNs.

const ALLOWED_HOSTS = [
  /(^|\.)fal\.run$/,
  /(^|\.)fal\.media$/,
  /(^|\.)supabase\.co$/,
  /(^|\.)googleusercontent\.com$/,
  /(^|\.)cloudfront\.net$/,
  /(^|\.)cdninstagram\.com$/,
]

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') || ''
  if (!raw) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  let url: URL
  try { url = new URL(raw) } catch { return NextResponse.json({ error: 'Invalid url' }, { status: 400 }) }
  if (url.protocol !== 'https:') return NextResponse.json({ error: 'Only https' }, { status: 400 })
  if (!ALLOWED_HOSTS.some(re => re.test(url.hostname))) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    const upstream = await fetch(url.toString())
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 })
    }
    const headers = new Headers()
    const ct = upstream.headers.get('content-type') || 'video/mp4'
    const cl = upstream.headers.get('content-length')
    headers.set('Content-Type', ct)
    if (cl) headers.set('Content-Length', cl)
    headers.set('Cache-Control', 'public, max-age=300')
    return new NextResponse(upstream.body, { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy failed' }, { status: 500 })
  }
}
