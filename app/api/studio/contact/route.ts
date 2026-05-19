import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/studio/contact
// Body: { studio_page_id, from_name, from_email, message }
//
// Saves the submission via the public Supabase client (RLS allows INSERT for enabled pages).
// If RESEND_API_KEY is set on the server, also forwards the message as an email to the page
// owner's contact_email.

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200
}

function clip(s: string, max: number): string {
  return (s || '').slice(0, max)
}

async function sendResend(args: { to: string; replyTo: string; subject: string; text: string }): Promise<string | null> {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'ViaTone <onboarding@resend.dev>',
        to: args.to,
        reply_to: args.replyTo,
        subject: args.subject,
        text: args.text,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[contact] Resend error', res.status, detail)
      return `Resend ${res.status}`
    }
    return null
  } catch (e: any) {
    console.error('[contact] Resend exception', e)
    return e?.message || 'Resend failed'
  }
}

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const studio_page_id = String(body.studio_page_id || '')
  const from_name = clip(String(body.from_name || ''), 120).trim()
  const from_email = clip(String(body.from_email || ''), 200).trim()
  const message = clip(String(body.message || ''), 4000).trim()

  if (!studio_page_id) return NextResponse.json({ error: 'Missing studio_page_id' }, { status: 400 })
  if (!from_name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  if (!isValidEmail(from_email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  if (message.length < 10) return NextResponse.json({ error: 'Message is too short' }, { status: 400 })

  // Capture some basic metadata for the inbox.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const ua = req.headers.get('user-agent') || null

  const { data: inserted, error } = await sb.from('contact_submissions').insert({
    studio_page_id,
    from_name,
    from_email,
    message,
    source_ip: ip,
    user_agent: ua,
  }).select('id').single()
  if (error) {
    console.error('[contact] insert error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Best-effort email delivery. Fetch the page's contact_email to know where to send.
  const { data: page } = await sb.from('studio_pages').select('id, name, slug, contact_email')
    .eq('id', studio_page_id).maybeSingle()
  let emailNote: string | null = null
  if (page?.contact_email) {
    const subject = `New message from ${from_name} via your ViaTone studio page`
    const text = [
      `From: ${from_name} <${from_email}>`,
      ``,
      message,
      ``,
      `---`,
      `Sent via your ViaTone studio page: /studio/${page.slug}`,
    ].join('\n')
    emailNote = await sendResend({ to: page.contact_email, replyTo: from_email, subject, text })
  }

  return NextResponse.json({ ok: true, id: inserted.id, email_note: emailNote })
}
