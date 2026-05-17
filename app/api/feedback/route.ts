import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

function clip(value: unknown, max: number) {
  const s = typeof value === 'string' ? value.trim() : ''
  return s ? s.slice(0, max) : ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const message = clip(body.message, 4000)
    const page = clip(body.page, 240) || '/'
    const type = ['feedback', 'bug', 'idea', 'billing', 'ux'].includes(body.type) ? body.type : 'feedback'
    if (message.length < 3) return NextResponse.json({ error: 'message_too_short' }, { status: 400 })

    const sb = serviceClient()
    let userId: string | null = null
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (token) {
      const { data: { user } } = await sb.auth.getUser(token)
      userId = user?.id || null
    }

    const { error } = await sb.from('beta_feedback').insert({
      user_id: userId,
      page,
      type,
      message,
      metadata: {
        user_agent: clip(req.headers.get('user-agent'), 500),
        referrer: clip(req.headers.get('referer'), 500),
      },
    })

    if (error) return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'feedback_failed' }, { status: 500 })
  }
}
