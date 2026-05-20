import type { SupabaseClient } from '@supabase/supabase-js'
import { detectLastfmAcrossCampaigns } from '@/lib/lastfm/detectSuggestions'
import type { LastfmActivitySuggestion } from '@/lib/lastfm/detectSuggestions'
import { buildSessionId } from './sessionId'
import type { MatchedTrackRow } from './types'

const MAX_TRACKS_JSON = 40

function tracksFromSuggestion(item: LastfmActivitySuggestion): MatchedTrackRow[] {
  return item.matched.slice(0, MAX_TRACKS_JSON).map(m => ({
    artist: m.scrobble.artist,
    track: m.scrobble.track,
    playedAt: m.scrobble.playedAt.toISOString(),
    playlistPosition: m.playlistPosition,
    method: m.method,
  }))
}

export async function syncUserLastfmPassive(
  sb: SupabaseClient,
  userId: string,
  opts?: { lastfmUsername?: string; force?: boolean }
): Promise<{ created: number; skipped: number; scanned: number }> {
  const { data: profile } = await sb
    .from('profiles')
    .select('lastfm_username, lastfm_auto_sync, lastfm_last_sync_at')
    .eq('id', userId)
    .maybeSingle()

  const username = opts?.lastfmUsername?.trim() || profile?.lastfm_username?.trim()
  if (!username) return { created: 0, skipped: 0, scanned: 0 }

  if (!opts?.force && profile && !profile.lastfm_auto_sync) {
    return { created: 0, skipped: 0, scanned: 0 }
  }

  const lastSync = profile?.lastfm_last_sync_at ? new Date(profile.lastfm_last_sync_at).getTime() : 0
  const minIntervalMs = 6 * 60 * 60 * 1000
  if (!opts?.force && lastSync && Date.now() - lastSync < minIntervalMs) {
    return { created: 0, skipped: 0, scanned: 0 }
  }

  const { suggestions } = await detectLastfmAcrossCampaigns(sb, userId, {
    lastfmUsername: username,
  })

  let created = 0
  let skipped = 0

  for (const s of suggestions) {
    const session = s.sessions[0]
    if (!session) {
      skipped += 1
      continue
    }
    const sessionId = buildSessionId(s.campaignId, session.startIso)

    const { data: dup } = await sb
      .from('campaign_activity_suggestions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('campaign_id', s.campaignId)
      .eq('session_id', sessionId)
      .maybeSingle()

    if (dup) {
      skipped += 1
      continue
    }

    const { data: existingLog } = await sb
      .from('campaign_activity_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('campaign_id', s.campaignId)
      .eq('activity_date', s.activityDate)
      .in('status', ['submitted', 'approved', 'pending'])
      .maybeSingle()

    if (existingLog) {
      skipped += 1
      continue
    }

    const summary = [
      s.headline,
      s.sessionLabel ? `Session: ${s.sessionLabel}` : '',
      '',
      'Passive listening activity suggestion — participation evidence from Last.fm scrobble matching, not verified Spotify streams.',
    ]
      .filter(Boolean)
      .join('\n')

    const { error } = await sb.from('campaign_activity_suggestions').insert({
      user_id: userId,
      campaign_id: s.campaignId,
      member_id: s.memberId,
      session_id: sessionId,
      confidence: s.confidence,
      summary,
      matched_tracks: tracksFromSuggestion(s),
      playlist_coverage_percent: s.completionPercent,
      session_start_at: session.startIso,
      session_end_at: session.endIso,
      activity_date: s.activityDate,
      from_date: s.fromDate,
      to_date: s.toDate,
      status: 'pending',
    })

    if (error) {
      skipped += 1
    } else {
      created += 1
    }
  }

  await sb
    .from('profiles')
    .update({
      lastfm_username: username,
      lastfm_last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return { created, skipped, scanned: suggestions.length }
}

export async function runBackgroundLastfmSync(sb: SupabaseClient): Promise<{
  users: number
  created: number
  errors: number
}> {
  const { data: users } = await sb
    .from('profiles')
    .select('id, lastfm_username')
    .eq('lastfm_auto_sync', true)
    .not('lastfm_username', 'is', null)

  let created = 0
  let errors = 0
  for (const u of users || []) {
    if (!u.lastfm_username) continue
    try {
      const r = await syncUserLastfmPassive(sb, u.id, {
        lastfmUsername: u.lastfm_username,
        force: false,
      })
      created += r.created
    } catch {
      errors += 1
    }
  }
  return { users: users?.length || 0, created, errors }
}
