import { NextRequest, NextResponse } from 'next/server'

// GET /api/canvas/status?status_url=...&response_url=...
// Polls fal.ai for job status. When COMPLETED, also fetches the response (which contains the video URL)
// so the client only needs one round-trip per poll.

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
      // Seedance returns { video: { url } } typically; some models return { videos: [{ url }] }.
      video_url = r?.video?.url || r?.videos?.[0]?.url || r?.output?.video?.url || null
    }
    return NextResponse.json({ status: stage, video_url, raw_response })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Status check failed' }, { status: 500 })
  }
}
