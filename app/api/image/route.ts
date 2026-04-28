import { NextRequest, NextResponse } from 'next/server'

// POST /api/image
// Body: { prompt: string, size?: '1024x1024' | '1024x1536' | '1536x1024', quality?: 'low' | 'medium' | 'high' }
// Response: { b64: string, mime: string } or { error: string }
//
// Uses OpenAI's gpt-image-1 model. Returns base64-encoded PNG data; the client uploads it to
// Supabase Storage (so we don't need a server-side Supabase service-role key).
//
// Costs (as of 2025, subject to change):
//   gpt-image-1 standard 1024x1024 ≈ $0.07 per image. Higher quality / larger sizes cost more.

export async function POST(req: NextRequest) {
  const { prompt, size = '1024x1024', quality = 'medium' } = await req.json() as {
    prompt: string
    size?: '1024x1024' | '1024x1536' | '1536x1024'
    quality?: 'low' | 'medium' | 'high'
  }

  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not set on the server' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size,
        quality,
        // gpt-image-1 always returns base64; no `response_format` field needed.
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      const detail = data?.error?.message || JSON.stringify(data)
      return NextResponse.json({ error: `OpenAI ${res.status}: ${detail}` }, { status: res.status })
    }
    const b64 = data?.data?.[0]?.b64_json
    if (!b64) {
      return NextResponse.json({ error: 'No image data returned' }, { status: 500 })
    }
    return NextResponse.json({ b64, mime: 'image/png' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Image request failed' }, { status: 500 })
  }
}
