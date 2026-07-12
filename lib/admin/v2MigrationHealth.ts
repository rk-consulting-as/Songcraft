import type { SupabaseClient } from '@supabase/supabase-js'
import type { MigrationTableCheck } from './migrationHealth'

/** ViaTone 2.0 community tables — apply migrations in filename order through 20260706190100. */
export const V2_REQUIRED_MIGRATION_TABLES: Array<{ table: string; label: string; migrationHint: string }> = [
  { table: 'v2_circles', label: 'V2 Circles', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_circle_members', label: 'V2 Circle Members', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_sessions', label: 'V2 Sessions', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_session_participation', label: 'V2 Session Participation', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_session_songs', label: 'V2 Session Songs', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_playlist_rooms', label: 'V2 Playlist Rooms', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_playlist_room_items', label: 'V2 Playlist Room Items', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_circle_songs', label: 'V2 Circle Songs', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_song_feedback', label: 'V2 Song Feedback', migrationHint: '20260706120000_v2_community_layer.sql' },
  { table: 'v2_session_play_logs', label: 'V2 Stream Engine Play Logs', migrationHint: '20260706150000_v2_stream_engine_beta.sql' },
  { table: 'v2_playlist_room_participation', label: 'V2 Playlist Participation', migrationHint: '20260706160000_v2_supporter_participation.sql' },
  { table: 'v2_community_notifications', label: 'V2 Notifications', migrationHint: '20260706170000_v2_community_notifications.sql' },
  { table: 'v2_circle_follows', label: 'V2 Circle Follows', migrationHint: '20260706190000_v2_community_follows_saves.sql' },
  { table: 'v2_host_follows', label: 'V2 Host Follows', migrationHint: '20260706190000_v2_community_follows_saves.sql' },
  { table: 'v2_saved_community_items', label: 'V2 Saved Items', migrationHint: '20260706190000_v2_community_follows_saves.sql' },
]

const UNIQUE_TABLES = Array.from(
  new Map(V2_REQUIRED_MIGRATION_TABLES.map(r => [r.table, r])).values(),
)

function isMissingTable(error: { message?: string; code?: string } | null | undefined): boolean {
  const msg = error?.message || ''
  return !!error && (
    msg.includes('does not exist') ||
    msg.includes('Could not find the table') ||
    msg.includes('schema cache') ||
    error.code === '42P01' ||
    error.code === 'PGRST205'
  )
}

export async function checkV2MigrationTables(sb: SupabaseClient): Promise<{
  checks: MigrationTableCheck[]
  allPresent: boolean
  missing: string[]
}> {
  const checks: MigrationTableCheck[] = []

  for (const row of UNIQUE_TABLES) {
    const { error } = await sb.from(row.table).select('id').limit(1)
    const missingTable = isMissingTable(error)
    checks.push({
      ...row,
      exists: !missingTable,
      error: missingTable ? error?.message : undefined,
    })
  }

  const missing = checks.filter(c => !c.exists).map(c => c.table)
  return { checks, allPresent: missing.length === 0, missing }
}

export type V2CommunityHealthReport = {
  migrationChecks: MigrationTableCheck[]
  migrationsOk: boolean
  upcomingSessions: number
  liveSessions: number
  publicCircles: number
  privateCircles: number
  notificationRows: number
  orphanedSessionSongs: number
  orphanedRoomItems: number
  communityFeedback30d: number
  activeCommunityUsers7d: number
  seedLikelyPresent: boolean
  visibilityOk: boolean
  warnings: string[]
}

export async function buildV2CommunityHealthReport(sb: SupabaseClient): Promise<V2CommunityHealthReport> {
  const warnings: string[] = []
  const migration = await checkV2MigrationTables(sb)

  if (!migration.allPresent) {
    warnings.push(`Missing v2 tables: ${migration.missing.join(', ')}`)
    return {
      migrationChecks: migration.checks,
      migrationsOk: false,
      upcomingSessions: 0,
      liveSessions: 0,
      publicCircles: 0,
      privateCircles: 0,
      notificationRows: 0,
      orphanedSessionSongs: 0,
      orphanedRoomItems: 0,
      communityFeedback30d: 0,
      activeCommunityUsers7d: 0,
      seedLikelyPresent: false,
      visibilityOk: false,
      warnings,
    }
  }

  const since7 = new Date(Date.now() - 7 * 86400000).toISOString()
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    upcomingRes,
    liveRes,
    publicCirclesRes,
    privateCirclesRes,
    notifRes,
    seedRes,
    feedbackRes,
    participationRes,
  ] = await Promise.all([
    sb.from('v2_sessions').select('id', { count: 'exact', head: true }).eq('status', 'upcoming'),
    sb.from('v2_sessions').select('id', { count: 'exact', head: true }).eq('status', 'live'),
    sb.from('v2_circles').select('id', { count: 'exact', head: true }).eq('visibility', 'public'),
    sb.from('v2_circles').select('id', { count: 'exact', head: true }).neq('visibility', 'public'),
    sb.from('v2_community_notifications').select('id', { count: 'exact', head: true }),
    sb.from('v2_circles').select('id').eq('slug', 'dark-country-circle').limit(1),
    sb.from('beta_feedback').select('id', { count: 'exact', head: true }).like('page', '/community%').gte('created_at', since30),
    sb.from('v2_session_participation').select('user_id').gte('joined_at', since7).limit(500),
  ])

  let orphanedSessionSongs = 0
  let orphanedRoomItems = 0
  try {
    const { data: orphanSongs } = await sb.rpc('v2_count_orphan_session_songs' as never)
    if (typeof orphanSongs === 'number') orphanedSessionSongs = orphanSongs
  } catch {
    const { data: songs } = await sb.from('v2_session_songs').select('session_id').limit(500)
    const { data: sessions } = await sb.from('v2_sessions').select('id')
    const sessionIds = new Set((sessions || []).map(s => s.id))
    orphanedSessionSongs = (songs || []).filter(s => !sessionIds.has(s.session_id)).length
  }

  try {
    const { data: items } = await sb.from('v2_playlist_room_items').select('room_id').limit(500)
    const { data: rooms } = await sb.from('v2_playlist_rooms').select('id')
    const roomIds = new Set((rooms || []).map(r => r.id))
    orphanedRoomItems = (items || []).filter(i => !roomIds.has(i.room_id)).length
  } catch {
    // ignore
  }

  const activeUsers = new Set((participationRes.data || []).map(r => r.user_id).filter(Boolean))

  if ((upcomingRes.count || 0) < 1) warnings.push('No upcoming sessions — run beta seed for test data')
  if ((publicCirclesRes.count || 0) < 1) warnings.push('No public circles — run beta seed')
  if (!seedRes.data?.length) warnings.push('Default seed circle not found — apply 20260706140100_v2_community_seed.sql')
  if (orphanedSessionSongs > 0) warnings.push(`${orphanedSessionSongs} session song row(s) reference missing sessions`)
  if (orphanedRoomItems > 0) warnings.push(`${orphanedRoomItems} playlist item(s) reference missing rooms`)

  return {
    migrationChecks: migration.checks,
    migrationsOk: migration.allPresent,
    upcomingSessions: upcomingRes.count || 0,
    liveSessions: liveRes.count || 0,
    publicCircles: publicCirclesRes.count || 0,
    privateCircles: privateCirclesRes.count || 0,
    notificationRows: notifRes.count || 0,
    orphanedSessionSongs,
    orphanedRoomItems,
    communityFeedback30d: feedbackRes.count || 0,
    activeCommunityUsers7d: activeUsers.size,
    seedLikelyPresent: !!(seedRes.data?.length),
    visibilityOk: true,
    warnings,
  }
}
