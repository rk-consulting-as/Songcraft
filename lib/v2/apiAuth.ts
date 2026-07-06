import { NextRequest } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function v2AuthClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  )
}

export function v2ServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

export async function requireV2User(req: NextRequest): Promise<{ sb: SupabaseClient; userId: string } | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const sb = v2AuthClient(token)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  return { sb, userId: user.id }
}

export function clipText(value: unknown, max: number): string {
  const s = typeof value === 'string' ? value.trim() : ''
  return s ? s.slice(0, max) : ''
}
