import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

async function requireAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const sb = serviceClient()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const { data: profile } = await sb.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  return { sb, actor: profile as { id: string; role: 'admin' | 'super_admin' } }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error
  const { sb, actor } = auth
  const userId = params.id
  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : null
  let expiresAt: string | null = null
  if (typeof body.expires_at === 'string' && body.expires_at) {
    const parsed = new Date(body.expires_at)
    if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: 'invalid_expires_at' }, { status: 400 })
    expiresAt = parsed.toISOString()
  }

  const { data: target } = await sb.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (!target) return NextResponse.json({ error: 'user_not_found' }, { status: 404 })

  await sb.from('manual_plan_overrides').update({
    revoked_at: new Date().toISOString(),
    revoked_by: actor.id,
  }).eq('user_id', userId).eq('plan_key', 'pro').is('revoked_at', null)

  const { data: override, error } = await sb.from('manual_plan_overrides').insert({
    user_id: userId,
    plan_key: 'pro',
    expires_at: expiresAt,
    granted_by: actor.id,
    reason,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb.from('admin_audit_log').insert({
    actor_id: actor.id,
    target_user_id: userId,
    target_type: 'manual_plan_override',
    target_id: override?.id || null,
    action: 'grant_manual_pro',
    metadata: { expires_at: expiresAt, reason },
  })

  return NextResponse.json({ ok: true, override_id: override?.id || null })
}
