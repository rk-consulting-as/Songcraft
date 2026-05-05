import { NextRequest, NextResponse } from 'next/server'

// GET /api/canvas/status?status_url=...&response_url=...
// Polls fal.ai for job status. When COMPLETED, also fetches the response (which contains the video URL)
// so the client only needs one round-trip per poll.

/**
 * Walk a fal.ai response payload and find the first plausible video URL.
 * fal.ai response shape varies by model — common locations:
 *   { video: { url } }                          (most Seedance variants)
 *   { videos: [{ url }] }                       (some video models)
 *   { output: { video: { url } } }              (legacy / proxied models)
 *   { data: { video: { url } } }
 *   { url } / { output_url }                    (fallback)
 *   { video_url } / { output: { url } }
 */
function findVideoUrl(obj: any, depth = 0): string | null {
  if (depth > 6 || obj == null) return null
  if (typeof obj === 'string') {
    return /^https?:\/\/.+\.(mp4|webm|mov)(\?|$)/i.test(obj) ? obj : null
  }
  if (typeof obj !== 'object') return null
  // Direct fields first.
  for (const k of ['url', 'video_url', 'output_url']) {
    if (typeof obj[k] === 'string' && /^https?:\/\/.+\.(mp4|webm|mov)(\?|$)/i.test(obj[k])) return obj[k]
  }
  // Common nested shapes.
  for (const k of ['video', 'videos', 'output', 'data', 'result']) {
    const v = obj[k]
    if (Array.isArray(v)) {
      for (const item of v) {
        const found = findVideoUrl(item, depth + 1)
        if (found) return found
      }
    } else if (v && typeof v === 'object') {
      const found = findVideoUrl(v, depth + 1)
      if (found) return found
    }
  }
  // Last-ditch: scan all string values for a video URL.
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && /^https?:\/\/.+\.(mp4|webm|mov)(\?|$)/i.test(v)) return v
  }
  // Walk all object children up to the depth limit.
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const found = findVideoUrl(v, depth + 1)
      if (found) return found
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: 'FAL_KEY is not set' }, { status: 503 })
  }

  const status_url = req.nextUrl.searchParams.get('status_url')
  const response_url = req.nextUrl.searchParams.get('response_url')
  if (!status_url) return NextResponse.json({ error: 'Missing status_url' }, { status: 400 })

  // Both fal URLs must point to fal.run/queue.fal.run to avoid SSRF.
  if (!/^https:\/\/(queue\.)?fal\.run\//.test(status_url)) {
    return NextResponse.json({ error: 'Invalid status_url' }, { status: 400 })
  }
  if (response_url && !/^https:\/\/(queue\.)?fal\.run\//.test(response_url)) {
    return NextResponse.json({ error: 'Invalid response_url' }, { status: 400 })
  }

  try {
    const sRes = await fetch(status_url, {
      headers: { Authorization: `Key ${process.env.FAL_KEY}` },
      cache: 'no-store',
    })
    const status = await sRes.json().catch(() => ({}))
    if (!sRes.ok) {
      return NextResponse.json(
        { error: `fal.ai status ${sRes.status}: ${status?.detail || 'unknown'}` },
        { status: sRes.status }
      )
    }
    const stage = status?.status || 'UNKNOWN'
    let video_url: string | null = null
    let raw_response: any = null
    if (stage === 'COMPLETED' && response_url) {
      const rRes = await fetch(response_url, {
        headers: { Authorization: `Key ${process.env.FAL_KEY}` },
        cache: 'no-store',
      })
      const r = await rRes.json().catch(() => ({}))
      raw_response = r
      // Try every reasonable path video URL might live at across fal.ai model variants.
      video_url = findVideoUrl(r)
      if (!video_url) {
        console.warn('[canvas/status] Completed but no video URL found in response:', JSON.stringify(r).slice(0, 1000))
      } else {
        console.log('[canvas/status] Completed, video URL:', video_url)
      }
    }
    return NextResponse.json({ status: stage, video_url, raw_response })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Status check failed' }, { status: 500 })
  }
}
