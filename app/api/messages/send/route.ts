import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/messages/send
// Body: { conversation_id: string, content: string }
// Requires auth (Bearer token). The DB RLS policy enforces sender_id = auth.uid()
// and membership in the conversation, so we don't need to re-check here.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'bad_json' }, { status: 400 })

    const conversationId = String(body.conversation_id || '').trim()
    const content = String(body.content || '').trim()
    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 10) : []
    if (!conversationId) return NextResponse.json({ error: 'missing_conversation_id' }, { status: 400 })
    if (!content && attachments.length === 0) return NextResponse.json({ error: 'empty_content' }, { status: 400 })
    if (content.length > 4000) return NextResponse.json({ error: 'too_long' }, { status: 400 })

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    )

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

    // Block check: if any participant in the conversation has blocked the sender (or vice versa),
    // refuse. Direct conversations are most likely to hit this.
    const { data: parts } = await sb
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
    const otherUserIds = (parts || []).map(p => (p as any).user_id).filter(id => id !== user.id)

    if (otherUserIds.length > 0) {
      const { data: blocks } = await sb
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.in.(${otherUserIds.join(',')})),and(blocked_id.eq.${user.id},blocker_id.in.(${otherUserIds.join(',')}))`)
      if (blocks && blocks.length > 0) {
        return NextResponse.json({ error: 'blocked' }, { status: 403 })
      }
    }

    const { data: msg, error } = await sb
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content, attachments })
      .select('id, conversation_id, sender_id, content, attachments, created_at')
      .single()
    if (error) {
      console.error('[messages/send] insert failed:', error.message)
      return NextResponse.json({ error: 'send_failed', message: error.message }, { status: 500 })
    }

    // Fire-and-forget email notifications to all other participants.
    // Done after the response is sent so the user doesn't wait for SMTP.
    ;(async () => {
      try {
        const { sendNotificationEmail } = await import('@/lib/email')
        const { data: senderProf } = await sb.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
        const senderName = (senderProf as any)?.display_name || 'A user'
        for (const recipientId of otherUserIds) {
          sendNotificationEmail({
            kind: 'new_message',
            recipientUserId: recipientId,
            payload: {
              sender_name: senderName,
              preview: content,
              conversation_id: conversationId,
            },
          }).catch(e => console.warn('[messages/send] notify failed:', e?.message))
        }
      } catch (e: any) {
        console.warn('[messages/send] notify dispatch error:', e?.message)
      }
    })()

    return NextResponse.json({ ok: true, message: msg })
  } catch (e: any) {
    return NextResponse.json({ error: 'crashed', message: e?.message || String(e) }, { status: 500 })
  }
}
