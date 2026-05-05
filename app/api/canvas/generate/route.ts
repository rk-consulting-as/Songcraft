import { NextRequest, NextResponse } from 'next/server'

// POST /api/canvas/generate
// Submit a video generation job to fal.ai (Seedance Pro by default).
//
// Body: {
//   prompt: string,
//   mode?: 'text-to-video' | 'image-to-video' (default text-to-video),
//   image_url?: string (required when mode=image-to-video),
//   aspect_ratio?: '9:16'|'16:9'|'1:1',
//   duration?: number
// }
// Returns: { request_id, status_url, response_url, model } or { error }
//
// fal.ai uses an async queue API: submit returns IDs, client polls /api/canvas/status until done.

/**
 * fal.ai's current Seedance path uses slash-separated version segments.
 * Override via FAL_VIDEO_MODEL if fal.ai changes this.
 *
 * Tolerates a few common copy-paste mistakes:
 *   - Full URL like https://fal.ai/models/fal-ai/...
 *   - Leading/trailing slashes or whitespace
 */
function cleanModelPath(input: string): string {
  let s = (input || '').trim()
  // Strip the fal.ai web URL prefix if present.
  s = s.replace(/^https?:\/\/(www\.)?fal\.ai\/models\//i, '')
  // Strip leading/trailing slashes.
  s = s.replace(/^\/+|\/+$/g, '')
  return s
}

const TEXT_TO_VIDEO_MODEL = cleanModelPath(process.env.FAL_VIDEO_MODEL || 'fal-ai/bytedance/seedance/v1/pro/text-to-video')
const IMAGE_TO_VIDEO_MODEL = cleanModelPath(process.env.FAL_VIDEO_I2V_MODEL || 'fal-ai/bytedance/seedance/v1/pro/image-to-video')

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
  const mode = body.mode === 'image-to-video' ? 'image-to-video' : 'text-to-video'
  const image_url = String(body.image_url || '').trim()
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
  if (mode === 'image-to-video' && !image_url) {
    return NextResponse.json({ error: 'image_url is required when mode=image-to-video' }, { status: 400 })
  }

  const model = mode === 'image-to-video' ? IMAGE_TO_VIDEO_MODEL : TEXT_TO_VIDEO_MODEL
  // Build payload — image-to-video adds image_url; text-to-video adds aspect_ratio.
  const payload: Record<string, unknown> = { prompt, duration }
  if (mode === 'image-to-video') {
    payload.image_url = image_url
  } else {
    payload.aspect_ratio = aspect_ratio
  }

  try {
    const res = await fetch(`https://queue.fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.FAL_KEY}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: `fal.ai ${res.status} for model "${model}": ${data?.detail || data?.error || 'queue submit failed'}. Set FAL_VIDEO_MODEL env var if the model path has changed.` },
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
