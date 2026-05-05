import { NextRequest, NextResponse } from 'next/server'

// POST /api/canvas/generate
// Submit a video generation job to fal.ai (Seedance Pro by default).
//
// Body: { prompt: string, aspect_ratio?: '9:16'|'16:9'|'1:1', duration?: number }
// Returns: { request_id, status_url, response_url, model } or { error }
//
// fal.ai uses an async queue API: submit returns IDs, client polls /api/canvas/status until done.

const DEFAULT_MODEL = process.env.FAL_VIDEO_MODEL || 'fal-ai/bytedance/seedance-1-pro/text-to-video'

export async function POST(req: NextRequest) {
  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: 'FAL_KEY is not set on the server. Add it to enable AI video generation.' },
      { status: 503 }
    )
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const prompt = String(body.prompt || '').trim()
  const aspect_ratio = String(body.aspect_ratio || '9:16')
  const duration = Number(body.duration || 5)

  if (!prompt || prompt.length < 5) {
    return NextResponse.json({ error: 'Prompt must be at least 5 characters' }, { status: 400 })
  }
  if (!['9:16', '16:9', '1:1'].includes(aspect_ratio)) {
    return NextResponse.json({ error: 'Invalid aspect_ratio' }, { status: 400 })
  }
  if (duration < 3 || duration > 10) {
    return NextResponse.json({ error: 'Duration must be 3–10 seconds' }, { status: 400 })
  }

  const model = DEFAULT_MODEL
  try {
    const res = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        aspect_ratio,
        duration,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: `fal.ai ${res.status}: ${data?.detail || data?.error || 'queue submit failed'}` },
        { status: res.status }
      )
    }
    return NextResponse.json({
      request_id: data.request_id,
      status_url: data.status_url,
      response_url: data.response_url,
      model,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fal.ai request failed' }, { status: 500 })
  }
}
