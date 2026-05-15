import { NextRequest, NextResponse } from 'next/server'
import { sendNotificationEmail, type NotificationKind } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/notify/dispatch
 *
 * Body: {
 *   kind: NotificationKind,
 *   recipient_id: string,
 *   payload: object
 * }
 *
 * Used by:
 *   - Internal API calls (e.g. /api/messages/send after a message is saved)
 *   - Supabase Database Webhooks for trigger-driven events
 *
 * Auth: requires either a logged-in user OR a valid INTERNAL_NOTIFY_SECRET header
 * (used by Supabase Database Webhooks).
 */

export async function POST(req: NextRequest) {
  try {
    // Authorize the call
    const internalSecret = req.headers.get('x-internal-secret')
    const expectedSecret = process.env.INTERNAL_NOTIFY_SECRET
    const isInternal = !!(expectedSecret && internalSecret === expectedSecret)

    let authedUserId: string | null = null
    if (!isInternal) {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
          )
          const { data } = await sb.auth.getUser()
          authedUserId = data.user?.id || null
        } catch {}
      }
      if (!authedUserId) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'bad_json' }, { status: 400 })

    const kind = String(body?.kind || '') as NotificationKind
    const recipientId = String(body?.recipient_id || '').trim()
    const payload = body?.payload || {}

    if (!kind || !recipientId) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }

    // Don't email yourself
    if (authedUserId && authedUserId === recipientId) {
      return NextResponse.json({ ok: true, skipped: 'self' })
    }

    const result = await sendNotificationEmail({
      kind,
      recipientUserId: recipientId,
      payload,
    })
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('[notify/dispatch] crashed:', e?.message)
    return NextResponse.json({ error: 'crashed', message: e?.message || String(e) }, { status: 500 })
  }
}
