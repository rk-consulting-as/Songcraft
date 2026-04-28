import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages, system } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      system,
      messages,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Anthropic API error:', data)
    return NextResponse.json({ text: '', error: data.error?.message || 'API-feil' }, { status: 500 })
  }

  const text = data.content?.find((b: any) => b.type === 'text')?.text || ''
  return NextResponse.json({ text })
}