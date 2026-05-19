import type { SupabaseClient } from '@supabase/supabase-js'
import { checkMigrationTables } from './migrationHealth'

export type ReadinessItem = {
  id: string
  label: string
  status: 'ok' | 'warn' | 'missing' | 'info'
  detail: string
}

export async function buildBetaReadinessReport(sb: SupabaseClient): Promise<{
  items: ReadinessItem[]
  ready: boolean
  warnCount: number
  missingCount: number
}> {
  const items: ReadinessItem[] = []

  const env = (key: string) => !!process.env[key]

  items.push({
    id: 'env_supabase_url',
    label: 'NEXT_PUBLIC_SUPABASE_URL',
    status: env('NEXT_PUBLIC_SUPABASE_URL') ? 'ok' : 'missing',
    detail: env('NEXT_PUBLIC_SUPABASE_URL') ? 'Set' : 'Required for all data',
  })
  items.push({
    id: 'env_supabase_anon',
    label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    status: env('NEXT_PUBLIC_SUPABASE_ANON_KEY') ? 'ok' : 'missing',
    detail: env('NEXT_PUBLIC_SUPABASE_ANON_KEY') ? 'Set' : 'Required for client auth',
  })
  items.push({
    id: 'env_service_role',
    label: 'SUPABASE_SERVICE_ROLE_KEY',
    status: env('SUPABASE_SERVICE_ROLE_KEY') ? 'ok' : 'missing',
    detail: env('SUPABASE_SERVICE_ROLE_KEY') ? 'Set' : 'Required for admin APIs & webhooks',
  })
  items.push({
    id: 'stripe',
    label: 'Stripe',
    status: env('STRIPE_SECRET_KEY') && env('STRIPE_WEBHOOK_SECRET') ? 'ok' : 'warn',
    detail:
      env('STRIPE_SECRET_KEY') && env('STRIPE_WEBHOOK_SECRET')
        ? 'Configured'
        : 'Billing checkout disabled until configured',
  })
  items.push({
    id: 'resend',
    label: 'Resend (email)',
    status: env('RESEND_API_KEY') ? 'ok' : 'warn',
    detail: env('RESEND_API_KEY') ? 'Configured' : 'Email notifications disabled',
  })
  items.push({
    id: 'ai_anthropic',
    label: 'Anthropic AI',
    status: env('ANTHROPIC_API_KEY') ? 'ok' : 'warn',
    detail: env('ANTHROPIC_API_KEY') ? 'Configured' : 'Some AI features unavailable',
  })
  items.push({
    id: 'ai_openai',
    label: 'OpenAI',
    status: env('OPENAI_API_KEY') ? 'ok' : 'info',
    detail: env('OPENAI_API_KEY') ? 'Configured' : 'Optional fallback',
  })

  const migrations = await checkMigrationTables(sb)
  for (const c of migrations.checks) {
    items.push({
      id: `table_${c.table}`,
      label: `Table: ${c.label}`,
      status: c.exists ? 'ok' : 'missing',
      detail: c.exists ? 'Present' : `Run migration ${c.migrationHint}`,
    })
  }

  let storageOk = false
  try {
    const { data, error } = await sb.storage.listBuckets()
    storageOk = !error && (data || []).some(b => b.id === 'media-library' || b.name === 'media-library')
  } catch {
    storageOk = false
  }
  items.push({
    id: 'storage_media',
    label: 'Storage bucket: media-library',
    status: storageOk ? 'ok' : 'warn',
    detail: storageOk ? 'Bucket found' : 'Check media_assets migration / bucket setup',
  })

  items.push({
    id: 'feedback',
    label: 'Beta feedback system',
    status: migrations.checks.find(c => c.table === 'beta_feedback')?.exists !== false ? 'ok' : 'warn',
    detail: 'Floating feedback button + /api/feedback + admin inbox',
  })

  items.push({
    id: 'public_pages',
    label: 'Public pages (/p, /s, /epk, /discover)',
    status: 'info',
    detail: 'Verify admin_hidden and public_hidden filters in catalog & page loaders',
  })

  items.push({
    id: 'sitemap',
    label: 'Sitemap',
    status: 'info',
    detail: 'app/sitemap.ts — excludes hidden content',
  })

  const missingCount = items.filter(i => i.status === 'missing').length
  const warnCount = items.filter(i => i.status === 'warn').length
  const ready = missingCount === 0

  return { items, ready, warnCount, missingCount }
}
