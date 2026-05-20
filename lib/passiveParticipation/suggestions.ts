import type { SupabaseClient } from '@supabase/supabase-js'
import { getApprovedMembership } from '@/lib/playlistCommunities/campaignAccess'
import type { ActivitySuggestion, MatchedTrackRow } from './types'
import { recordParticipationDay } from './streaks'

export async function fetchPendingSuggestions(
  sb: SupabaseClient,
  userId: string,
  limit = 20
): Promise<ActivitySuggestion[]> {
  const { data: rows } = await sb
    .from('campaign_activity_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!rows?.length) return []

  const campaignIds = Array.from(new Set(rows.map(r => r.campaign_id)))
  const { data: campaigns } = await sb
    .from('playlist_campaigns')
    .select('id, title, playlist_id')
    .in('id', campaignIds)

  const playlistIds = Array.from(new Set((campaigns || []).map(c => c.playlist_id)))
  const { data: playlists } = playlistIds.length
    ? await sb.from('creator_playlists').select('id, title, image_url').in('id', playlistIds)
    : { data: [] }

  const cMap = Object.fromEntries((campaigns || []).map(c => [c.id, c]))
  const pMap = Object.fromEntries((playlists || []).map(p => [p.id, p]))

  return rows.map(r => {
    const c = cMap[r.campaign_id]
    const pl = c ? pMap[c.playlist_id] : null
    return {
      ...r,
      matched_tracks: (r.matched_tracks || []) as MatchedTrackRow[],
      campaignTitle: c?.title,
      playlistTitle: pl?.title,
      playlistImageUrl: pl?.image_url,
    } as ActivitySuggestion
  })
}

export async function approveSuggestion(
  sb: SupabaseClient,
  userId: string,
  suggestionId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: sug } = await sb
    .from('campaign_activity_suggestions')
    .select('*')
    .eq('id', suggestionId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!sug) return { ok: false, error: 'not_found' }

  const member = await getApprovedMembership(sb, sug.campaign_id, userId)
  if (!member) return { ok: false, error: 'not_approved_member' }

  const { data: campaign } = await sb
    .from('playlist_campaigns')
    .select('id, title, user_id, playlist_id')
    .eq('id', sug.campaign_id)
    .maybeSingle()

  const { data: playlist } = await sb
    .from('creator_playlists')
    .select('spotify_url, spotify_playlist_id')
    .eq('id', campaign?.playlist_id || '')
    .maybeSingle()

  const proofText = [
    sug.summary,
    '',
    'Submitted via passive participation suggestion (Last.fm listening activity evidence).',
    'This does not verify actual Spotify streams.',
  ].join('\n')

  const { error: logErr } = await sb.from('campaign_activity_logs').upsert(
    {
      campaign_id: sug.campaign_id,
      member_id: member.id,
      user_id: userId,
      artist_id: member.artist_id,
      song_id: member.song_id,
      activity_date: sug.activity_date,
      status: 'submitted',
      proof_type: 'lastfm_import',
      proof_text: proofText,
      ai_summary: `Passive detection confidence: ${sug.confidence}. Coverage ${sug.playlist_coverage_percent}%.`,
      ai_confidence: sug.confidence,
      proof_asset_id: null,
    },
    { onConflict: 'member_id,activity_date' }
  )

  if (logErr) return { ok: false, error: logErr.message }

  await sb
    .from('campaign_activity_suggestions')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', suggestionId)

  await recordParticipationDay(sb, userId, sug.activity_date)

  if (campaign?.user_id) {
    const { queueCampaignParticipationNotification } = await import('@/lib/notifications/campaignParticipation')
    await queueCampaignParticipationNotification({
      recipientUserId: campaign.user_id,
      kind: 'activity_proof_review_needed',
      payload: {
        campaign_id: sug.campaign_id,
        campaign_title: campaign.title,
        activity_date: sug.activity_date,
      },
    })
  }

  return { ok: true }
}

export async function ignoreSuggestion(
  sb: SupabaseClient,
  userId: string,
  suggestionId: string
): Promise<{ ok: boolean }> {
  const { error } = await sb
    .from('campaign_activity_suggestions')
    .update({ status: 'ignored', updated_at: new Date().toISOString() })
    .eq('id', suggestionId)
    .eq('user_id', userId)
    .eq('status', 'pending')

  return { ok: !error }
}
