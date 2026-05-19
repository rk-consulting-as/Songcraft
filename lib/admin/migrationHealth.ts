import type { SupabaseClient } from '@supabase/supabase-js'

export type MigrationTableCheck = {
  table: string
  label: string
  migrationHint: string
  exists: boolean
  error?: string
}

export const REQUIRED_MIGRATION_TABLES: Array<{ table: string; label: string; migrationHint: string }> = [
  { table: 'media_assets', label: 'Media Library', migrationHint: '20260519140000_media_assets.sql' },
  { table: 'creator_playlists', label: 'Playlist Communities', migrationHint: '20260520120000_playlist_communities.sql' },
  { table: 'playlist_campaigns', label: 'Playlist Campaigns', migrationHint: '20260520120000_playlist_communities.sql' },
  { table: 'playlist_campaign_members', label: 'Campaign Members', migrationHint: '20260520120000_playlist_communities.sql' },
  { table: 'campaign_activity_logs', label: 'Activity Proof Logs', migrationHint: '20260521120000_campaign_activity_logs.sql' },
  { table: 'analytics_events', label: 'Analytics Events', migrationHint: 'analytics_events migration' },
  { table: 'subscriptions', label: 'Subscriptions', migrationHint: 'subscriptions / billing migration' },
  { table: 'onboarding_progress', label: 'Onboarding Progress', migrationHint: 'onboarding_progress migration' },
  { table: 'beta_feedback', label: 'Beta Feedback', migrationHint: 'beta_feedback migration' },
  { table: 'manual_plan_overrides', label: 'Manual Plan Overrides', migrationHint: 'manual_plan_overrides migration' },
]

export async function checkMigrationTables(sb: SupabaseClient): Promise<{
  checks: MigrationTableCheck[]
  allPresent: boolean
  missing: string[]
}> {
  const checks: MigrationTableCheck[] = []

  for (const row of REQUIRED_MIGRATION_TABLES) {
    const { error } = await sb.from(row.table).select('id').limit(1)
    const msg = error?.message || ''
    const missingTable =
      !!error &&
      (msg.includes('does not exist') ||
        msg.includes('Could not find the table') ||
        msg.includes('schema cache') ||
        error.code === '42P01' ||
        error.code === 'PGRST205')
    checks.push({
      ...row,
      exists: !missingTable,
      error: missingTable ? msg : undefined,
    })
  }

  const missing = checks.filter(c => !c.exists).map(c => c.table)
  return { checks, allPresent: missing.length === 0, missing }
}
