#!/usr/bin/env node
/**
 * Optional local seed for ViaTone v2 community.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env.
 * SQL migration 20260706140100_v2_community_seed.sql is the primary seed path.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const { data: users } = await sb.auth.admin.listUsers({ page: 1, perPage: 1 })
  const hostId = users?.users?.[0]?.id
  if (!hostId) {
    console.log('No users — create an account first, then run supabase db push')
    return
  }
  console.log('Community seed is applied via migration 20260706140100_v2_community_seed.sql')
  console.log('Host user for seed:', hostId)
  console.log('Run: npx supabase db push  (or apply migrations in dashboard)')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
