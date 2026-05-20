import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { getApprovedMembership } from '@/lib/playlistCommunities/campaignAccess'
import { runLastfmImportAnalysis } from '@/lib/lastfm/importProof'
import { recordParticipationDay } from '@/lib/passiveParticipation/streaks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const member = await getApprovedMembership(sb, params.id, userId)
  if (!member) return NextResponse.json({ error: 'not_approved_member' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const lastfmUsername = String(body.lastfm_username || '').trim()
  const fromDate = String(body.from_date || '').slice(0, 10)
  const toDate = String(body.to_date || '').slice(0, 10)
  const activityDate = body.activity_date ? String(body.activity_date).slice(0, 10) : toDate
  const previewOnly = body.preview === true

  if (!lastfmUsername) return NextResponse.json({ error: 'lastfm_username_required' }, { status: 400 })
  if (!fromDate || !toDate) return NextResponse.json({ error: 'date_range_required' }, { status: 400 })

  const { data: campaign } = await sb
    .from('playlist_campaigns')
    .select('id, title, user_id, playlist_id')
    .eq('id', params.id)
    .maybeSingle()

  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: playlist } = await sb
    .from('creator_playlists')
    .select('spotify_url, spotify_playlist_id, title')
    .eq('id', campaign.playlist_id)
    .maybeSingle()

  if (!playlist?.spotify_url && !playlist?.spotify_playlist_id) {
    return NextResponse.json({ error: 'playlist_spotify_missing' }, { status: 400 })
  }

  try {
    const { analysis, scrobbleCount, playlistTrackCount } = await runLastfmImportAnalysis({
      lastfmUsername,
      fromDate,
      toDate,
      playlistSpotifyUrl: playlist.spotify_url,
      playlistSpotifyId: playlist.spotify_playlist_id,
    })

    if (previewOnly) {
      return NextResponse.json({
        preview: true,
        analysis: {
          completionPercent: analysis.completionPercent,
          confidence: analysis.confidence,
          matchedCount: (() => {
            const s = new Set<number>()
            for (const m of analysis.matched) s.add(m.playlistPosition)
            return s.size
          })(),
          scrobbleCount,
          playlistTrackCount,
          summaryText: analysis.summaryText,
          explanation: analysis.explanation,
          clusterCount: analysis.clusterCount,
          sequenceMatches: analysis.sequenceMatches,
        },
      })
    }

    const row = {
      campaign_id: params.id,
      member_id: member.id,
      user_id: userId,
      artist_id: member.artist_id,
      song_id: member.song_id,
      activity_date: activityDate,
      status: 'submitted' as const,
      proof_type: 'lastfm_import' as const,
      proof_text: analysis.summaryText,
      ai_summary: analysis.explanation,
      ai_confidence: analysis.confidence,
      proof_asset_id: null,
    }

    const { data: log, error } = await sb
      .from('campaign_activity_logs')
      .upsert(row, { onConflict: 'member_id,activity_date' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (campaign.user_id) {
      const { queueCampaignParticipationNotification } = await import('@/lib/notifications/campaignParticipation')
      await queueCampaignParticipationNotification({
        recipientUserId: campaign.user_id,
        kind: 'activity_proof_review_needed',
        payload: {
          campaign_id: params.id,
          campaign_title: campaign.title,
          activity_date: activityDate,
        },
      })
    }

    await sb
      .from('profiles')
      .update({ lastfm_username: lastfmUsername, updated_at: new Date().toISOString() })
      .eq('id', userId)

    await recordParticipationDay(sb, userId, activityDate)

    return NextResponse.json({ log, analysis: { confidence: analysis.confidence, completionPercent: analysis.completionPercent } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'lastfm_import_failed'
    const status =
      msg === 'lastfm_not_configured' || msg === 'playlist_spotify_missing'
        ? 503
        : msg === 'invalid_date_range' || msg === 'date_range_too_long'
          ? 400
          : msg.includes('User not found') || msg.includes('user not found')
            ? 404
            : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
