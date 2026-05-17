import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

export async function GET() {
  const sb = serviceClient()
  if (!sb) {
    return NextResponse.json({
      beta_mode: { enabled: false, message: '', show_checklist: false },
      known_issues: { enabled: false, items: [] },
    })
  }

  const { data } = await sb
    .from('admin_platform_settings')
    .select('key, value')
    .in('key', ['beta_mode', 'known_issues'])

  const map = Object.fromEntries((data || []).map((row: any) => [row.key, row.value || {}]))
  return NextResponse.json({
    beta_mode: { enabled: false, message: '', show_checklist: false, ...(map.beta_mode || {}) },
    known_issues: { enabled: false, items: [], ...(map.known_issues || {}) },
  })
}
