import { NextRequest, NextResponse } from 'next/server'

// Unified AI text-generation endpoint. Dispatches to Anthropic or OpenAI based on `provider`.
//
// Body: { messages: ChatMessage[], system?: string, provider?: 'anthropic' | 'openai' }
// Response: { text: string } on success, { text: '', error: string } on failure (with HTTP 5xx/4xx).
//
// `messages` follows the OpenAI/Anthropic chat shape: [{ role: 'user' | 'assistant', content: string }, ...]

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type Provider = 'anthropic' | 'openai'

const ANTHROPIC_MODEL = 'claude-opus-4-6'
const OPENAI_MODEL = 'gpt-4o'

async function callAnthropic(messages: ChatMessage[], system: string | undefined) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system,
      messages,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || `Anthropic ${res.status}`)
  }
  const text = data.content?.find((b: any) => b.type === 'text')?.text || ''
  return text
}

async function callOpenAI(messages: ChatMessage[], system: string | undefined) {
  // OpenAI puts system prompt as the first message with role 'system'.
  const fullMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: fullMessages,
      max_tokens: 1500,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI ${res.status}`)
  }
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(req: NextRequest) {
  const { messages, system, provider } = await req.json() as {
    messages: ChatMessage[]
    system?: string
    provider?: Provider
  }

  const chosen: Provider = provider === 'openai' ? 'openai' : 'anthropic'

  try {
    const text = chosen === 'openai'
      ? await callOpenAI(messages, system)
      : await callAnthropic(messages, system)
    return NextResponse.json({ text, provider: chosen })
  } catch (e: any) {
    console.error(`${chosen} API error:`, e)
    return NextResponse.json(
      { text: '', error: e?.message || 'AI request failed', provider: chosen },
      { status: 500 }
    )
  }
}
