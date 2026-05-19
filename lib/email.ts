// Server-side email notification helper.
// Sends branded HTML emails via Resend, respecting user preferences and rate limits.

import { createClient } from '@supabase/supabase-js'

const RESEND_KEY = process.env.RESEND_API_KEY || ''
const FROM = process.env.RESEND_FROM || 'ViaTone <onboarding@resend.dev>'
import { resolveServerAppUrl } from '@/lib/appUrl'

const APP_URL = resolveServerAppUrl() || 'http://localhost:3000'

export type NotificationKind =
  | 'new_message'
  | 'new_follower'
  | 'signup_referral'
  | 'paid_referral'
  | 'badge_reached'
  | 'ticket_update'

// Map kind to the preference column on notification_preferences
const PREF_COLUMN: Record<NotificationKind, string> = {
  new_message:     'email_new_message',
  new_follower:    'email_new_follower',
  signup_referral: 'email_signup_referral',
  paid_referral:   'email_paid_referral',
  badge_reached:   'email_badge_reached',
  ticket_update:   'email_ticket_update',
}

// Visual primitives for the email templates
const ACCENT = '#d4a843'
const BG = '#0a0a0f'
const TEXT_BRIGHT = '#e8e0d0'
const TEXT_MUTED = '#8a7a60'

function shell(title: string, bodyHtml: string, ctaUrl: string, ctaText: string, unsubscribeUrl: string): string {
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${TEXT_BRIGHT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:30px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#14101a;border:1px solid rgba(212,168,67,0.25);border-radius:8px;max-width:560px;width:100%;">
        <tr><td style="padding:24px 28px 14px;border-bottom:1px solid rgba(212,168,67,0.15);">
          <a href="${APP_URL}" style="text-decoration:none;color:${ACCENT};font-size:18px;letter-spacing:3px;font-weight:300;">🎼 VIATONE</a>
        </td></tr>
        <tr><td style="padding:26px 28px 12px;">
          <h1 style="margin:0 0 14px;color:${TEXT_BRIGHT};font-size:20px;font-weight:600;">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:14px 28px 26px;">
          <a href="${ctaUrl}" style="display:inline-block;background:${ACCENT};color:#0a0a0f;text-decoration:none;padding:10px 22px;border-radius:6px;font-weight:600;font-size:14px;">${escapeHtml(ctaText)}</a>
        </td></tr>
        <tr><td style="padding:18px 28px 24px;border-top:1px solid rgba(180,140,80,0.12);color:${TEXT_MUTED};font-size:11px;">
          You are receiving this because your notification settings on ViaTone allow it.
          <a href="${unsubscribeUrl}" style="color:${TEXT_MUTED};">Update preferences</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!)
}

function clip(s: string, max = 180): string {
  if (!s) return ''
  return s.length > max ? s.slice(0, max).trim() + '…' : s
}

interface BuildArgs {
  kind: NotificationKind
  payload: any
  recipientName?: string
}

function buildEmail({ kind, payload, recipientName }: BuildArgs): { subject: string; html: string; ctaUrl: string; ctaText: string } {
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,'
  const prefsUrl = `${APP_URL}/profile#notifications`

  switch (kind) {
    case 'new_message': {
      const senderName = payload?.sender_name || 'Someone'
      const preview = clip(payload?.preview || '', 200)
      const convId = payload?.conversation_id
      const ctaUrl = convId ? `${APP_URL}/messages/${convId}` : `${APP_URL}/messages`
      return {
        subject: `New message from ${senderName} on ViaTone`,
        ctaText: 'Open conversation',
        ctaUrl,
        html: shell(
          `New message from ${senderName}`,
          `<p style="color:${TEXT_MUTED};font-size:14px;line-height:1.5;">${greeting}</p>
           <p style="color:${TEXT_BRIGHT};font-size:14px;line-height:1.5;">You have a new message:</p>
           <blockquote style="margin:14px 0;padding:12px 16px;background:rgba(255,255,255,0.04);border-left:3px solid ${ACCENT};color:${TEXT_BRIGHT};font-size:14px;">${escapeHtml(preview)}</blockquote>`,
          ctaUrl, 'Open conversation', prefsUrl
        ),
      }
    }
    case 'new_follower': {
      const followerName = payload?.follower_name || 'Someone'
      const followerCode = payload?.follower_code || ''
      const ctaUrl = followerCode ? `${APP_URL}/u/${followerCode}` : `${APP_URL}/discover`
      return {
        subject: `${followerName} started following you on ViaTone`,
        ctaText: 'View their profile',
        ctaUrl,
        html: shell(
          `${followerName} is now following you`,
          `<p style="color:${TEXT_MUTED};font-size:14px;line-height:1.5;">${greeting}</p>
           <p style="color:${TEXT_BRIGHT};font-size:14px;line-height:1.5;"><strong>${escapeHtml(followerName)}</strong> just started following your work on ViaTone.</p>`,
          ctaUrl, 'View their profile', prefsUrl
        ),
      }
    }
    case 'signup_referral': {
      const newUserName = payload?.referred_name || 'A new creator'
      const points = payload?.points || 0
      const level = payload?.level || 1
      const ctaUrl = `${APP_URL}/referrals`
      return {
        subject: `${newUserName} joined ViaTone via your link · +${points} pts`,
        ctaText: 'See your referrals',
        ctaUrl,
        html: shell(
          `${newUserName} joined via your referral`,
          `<p style="color:${TEXT_MUTED};font-size:14px;line-height:1.5;">${greeting}</p>
           <p style="color:${TEXT_BRIGHT};font-size:14px;line-height:1.5;">A new creator just signed up using your referral link${level > 1 ? ` (level ${level} in your downline)` : ''}.</p>
           <p style="color:${ACCENT};font-size:18px;font-weight:700;margin:16px 0;">✨ +${points} points</p>`,
          ctaUrl, 'See your referrals', prefsUrl
        ),
      }
    }
    case 'paid_referral': {
      const userName = payload?.referred_name || 'A user'
      const points = payload?.points || 0
      const level = payload?.level || 1
      const ctaUrl = `${APP_URL}/referrals`
      return {
        subject: `${userName} became a paying customer · +${points} pts`,
        ctaText: 'See your referrals',
        ctaUrl,
        html: shell(
          `${userName} became a paying customer`,
          `<p style="color:${TEXT_MUTED};font-size:14px;line-height:1.5;">${greeting}</p>
           <p style="color:${TEXT_BRIGHT};font-size:14px;line-height:1.5;">Someone in your downline (level ${level}) just converted to paid.</p>
           <p style="color:${ACCENT};font-size:18px;font-weight:700;margin:16px 0;">💳 +${points} points</p>`,
          ctaUrl, 'See your referrals', prefsUrl
        ),
      }
    }
    case 'badge_reached': {
      const tier = payload?.tier || 'bronze'
      const tierLabel = ({ bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' } as any)[tier] || tier
      const tierEmoji = ({ bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' } as any)[tier] || '🏆'
      const ctaUrl = `${APP_URL}/referrals`
      return {
        subject: `${tierEmoji} You reached ${tierLabel} on ViaTone`,
        ctaText: 'See your badges',
        ctaUrl,
        html: shell(
          `Congrats — you reached ${tierLabel}!`,
          `<p style="color:${TEXT_MUTED};font-size:14px;line-height:1.5;">${greeting}</p>
           <p style="color:${TEXT_BRIGHT};font-size:18px;line-height:1.5;text-align:center;margin:20px 0;">
             <span style="font-size:36px;">${tierEmoji}</span><br>
             <strong>${tierLabel}-level reached!</strong>
           </p>`,
          ctaUrl, 'See your badges', prefsUrl
        ),
      }
    }
    case 'ticket_update': {
      const subject = payload?.subject || 'your ticket'
      const status = payload?.status || 'updated'
      const convId = payload?.conversation_id
      const ctaUrl = convId ? `${APP_URL}/messages/${convId}` : `${APP_URL}/messages`
      return {
        subject: `Ticket update: ${subject}`,
        ctaText: 'View ticket',
        ctaUrl,
        html: shell(
          `Update on your ticket`,
          `<p style="color:${TEXT_MUTED};font-size:14px;line-height:1.5;">${greeting}</p>
           <p style="color:${TEXT_BRIGHT};font-size:14px;line-height:1.5;">Your support ticket "<strong>${escapeHtml(subject)}</strong>" has been updated.</p>
           <p style="color:${ACCENT};font-size:14px;font-weight:600;">Status: ${escapeHtml(status)}</p>`,
          ctaUrl, 'View ticket', prefsUrl
        ),
      }
    }
  }
}

/**
 * Sends a notification email if the recipient has it enabled.
 * Uses the service-role Supabase client (via env SUPABASE_SERVICE_ROLE_KEY if present)
 * so RLS doesn't get in the way of reading preferences.
 */
export async function sendNotificationEmail(args: {
  kind: NotificationKind
  recipientUserId: string
  payload: any
}): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  try {
    if (!RESEND_KEY) return { ok: false, skipped: 'no_resend_key' }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )

    // Look up recipient profile + preferences
    const [profRes, prefRes, userRes] = await Promise.all([
      sb.from('profiles').select('display_name').eq('id', args.recipientUserId).maybeSingle(),
      sb.from('notification_preferences').select('*').eq('user_id', args.recipientUserId).maybeSingle(),
      sb.auth.admin.getUserById(args.recipientUserId).catch(() => null as any),
    ])

    const email = userRes?.data?.user?.email
    if (!email) return { ok: false, skipped: 'no_email' }

    const prefs = prefRes.data as any
    if (prefs?.email_paused) return { ok: false, skipped: 'paused' }
    if (prefs?.frequency === 'off') return { ok: false, skipped: 'off' }
    const prefCol = PREF_COLUMN[args.kind]
    if (prefs && prefCol && prefs[prefCol] === false) return { ok: false, skipped: 'preference_off' }

    // Rate limit: max 1 email per user per kind per 10 minutes for some events
    const RATE_LIMITED: Set<string> = new Set(['new_message'])
    if (RATE_LIMITED.has(args.kind)) {
      const { data: recent } = await sb
        .from('notification_log')
        .select('id, created_at')
        .eq('user_id', args.recipientUserId)
        .eq('kind', args.kind)
        .gt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .limit(1)
      if (recent && recent.length > 0) return { ok: false, skipped: 'rate_limited' }
    }

    const built = buildEmail({ kind: args.kind, payload: args.payload, recipientName: (profRes.data as any)?.display_name })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: built.subject,
        html: built.html,
      }),
    })

    const sent = res.ok
    let errorMsg: string | null = null
    if (!sent) {
      errorMsg = await res.text().catch(() => 'resend_failed')
      console.warn('[email] Resend error', res.status, errorMsg)
    }

    // Log the attempt
    await sb.from('notification_log').insert({
      user_id: args.recipientUserId,
      kind: args.kind,
      related_id: args.payload?.conversation_id || args.payload?.related_id || null,
      email_sent: sent,
      error: errorMsg,
    })

    return sent ? { ok: true } : { ok: false, error: errorMsg || 'resend_failed' }
  } catch (e: any) {
    console.error('[email] sendNotificationEmail crashed:', e?.message)
    return { ok: false, error: e?.message || String(e) }
  }
}
