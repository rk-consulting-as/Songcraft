'use client'

import { createClient } from '@/lib/supabase'
import { formatV2ApiError } from '@/lib/v2/apiErrors'

export async function v2ApiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  const res = await fetch(path, { ...init, headers })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const code = (json as { error?: string }).error || `request_failed_${res.status}`
    throw new Error(formatV2ApiError(code))
  }
  return json as T
}

export { formatV2ApiError } from '@/lib/v2/apiErrors'
