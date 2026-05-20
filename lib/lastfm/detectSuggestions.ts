import type { SupabaseClient } from '@supabase/supabase-js'
import type { AiConfidence } from '@/lib/playlistCommunities/activityTypes'
import { extractSpotifyPlaylistId } from '@/lib/playlistCommunities/spotifyPlaylist'
import { fetchLastfmRecentTracks, lastfmApiKey } from './client'
import { analyzeLastfmPlaylistActivity, type ListeningSession } from './matchScrobbles'
import { fetchSpotifyPlaylistTracks } from './playlistTracks'
import { parseDateRange } from './importProof'

export type LastfmActivitySuggestion = {
  campaignId: string
  campaignTitle: string
  playlistTitle: string
  playlistImageUrl: string | null
  memberId: string
  matchedCount: number
  playlistTrackCount: number
  scrobbleCount: number
  completionPercent: number
  confidence: AiConfidence
  clusterCount: number
  sequenceMatches: number
  sessions: ListeningSession[]
  sessionLabel: string | null
  summaryText: string
  explanation: string
  fromDate: string
  toDate: string
  activityDate: string
  headline: string
}

const CONFIDENCE_RANK: Record<AiConfidence, number> = {
  high: 4,
  medium: 3,
  low: 2,
  unclear: 0,
}

function defaultDateRange(): { fromDate: string; toDate: string } {
  const to = new Date()
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  }
}

function formatSessionLabel(session: ListeningSession | null, tx?: { sessionTracks?: string; sessionMinutes?: string }): string | null {
  if (!session) return null
  const start = session.startIso.slice(0, 16).replace('T', ' ')
  if (tx?.sessionTracks && tx?.sessionMinutes) {
    return `${session.matchCount} ${tx.sessionTracks} · ${session.durationMinutes} ${tx.sessionMinutes} · ${start}`
  }
  return `${session.matchCount} tracks · ${session.durationMinutes} min · ${start}`
}

function suggestionHeadline(
  campaignTitle: string,
  confidence: AiConfidence,
  matchedCount: number,
  clusterCount: number
): string {
  const likely =
    confidence === 'high' || (confidence === 'medium' && (clusterCount >= 1 || matchedCount >= 2))
  if (likely) {
    return `Detected likely playlist activity — ${campaignTitle}`
  }
  return `Possible playlist activity — ${campaignTitle}`
}

function isSuggestible(confidence: AiConfidence, matchedCount: number): boolean {
  return matchedCount >= 1 && confidence !== 'unclear'
}

export async function detectLastfmAcrossCampaigns(
  sb: SupabaseClient,
  userId: string,
  opts: {
    lastfmUsername: string
    fromDate?: string
    toDate?: string
    focusCampaignId?: string
  }
): Promise<{
  suggestions: LastfmActivitySuggestion[]
  scrobbleCount: number
  fromDate: string
  toDate: string
  campaignsScanned: number
}> {
  const apiKey = lastfmApiKey()
  if (!apiKey) throw new Error('lastfm_not_configured')

  const range = opts.fromDate && opts.toDate ? { fromDate: opts.fromDate, toDate: opts.toDate } : defaultDateRange()
  const { from, to, error: rangeErr } = parseDateRange(range.fromDate, range.toDate)
  if (rangeErr) throw new Error(rangeErr)

  const username = opts.lastfmUsername.trim()
  if (!username) throw new Error('lastfm_username_required')

  const { data: memberships } = await sb
    .from('playlist_campaign_members')
    .select('id, campaign_id')
    .eq('user_id', userId)
    .eq('status', 'approved')

  const memberRows = memberships || []
  const campaignIds = memberRows.map(m => m.campaign_id)
  if (!campaignIds.length) {
    return { suggestions: [], scrobbleCount: 0, fromDate: range.fromDate, toDate: range.toDate, campaignsScanned: 0 }
  }

  const { data: campaigns } = await sb
    .from('playlist_campaigns')
    .select('id, title, status, playlist_id')
    .in('id', campaignIds)
    .in('status', ['open', 'active'])

  const campaignMap = Object.fromEntries((campaigns || []).map(c => [c.id, c]))
  type ActiveCampaign = { id: string; title: string; status: string; playlist_id: string }
  const rows = memberRows
    .map(m => ({ memberId: m.id, campaign: campaignMap[m.campaign_id] as ActiveCampaign | undefined }))
    .filter((r): r is { memberId: string; campaign: ActiveCampaign } => !!r.campaign)

  if (!rows.length) {
    return { suggestions: [], scrobbleCount: 0, fromDate: range.fromDate, toDate: range.toDate, campaignsScanned: 0 }
  }

  const scrobbles = await fetchLastfmRecentTracks({ username, from, to, apiKey })

  const playlistIds = Array.from(new Set(rows.map(r => r.campaign.playlist_id).filter(Boolean)))

  const { data: playlists } = playlistIds.length
    ? await sb
        .from('creator_playlists')
        .select('id, title, image_url, spotify_url, spotify_playlist_id')
        .in('id', playlistIds)
    : { data: [] }

  const plMap = Object.fromEntries((playlists || []).map(p => [p.id, p]))
  const trackCache = new Map<string, Awaited<ReturnType<typeof fetchSpotifyPlaylistTracks>>>()

  const suggestions: LastfmActivitySuggestion[] = []

  for (const row of rows) {
    const campaign = row.campaign
    const pl = plMap[campaign.playlist_id]
    if (!pl) continue

    const spotifyId = pl.spotify_playlist_id || extractSpotifyPlaylistId(pl.spotify_url || '')
    if (!spotifyId) continue

    let playlistTracks = trackCache.get(spotifyId)
    if (!playlistTracks) {
      try {
        playlistTracks = await fetchSpotifyPlaylistTracks(spotifyId)
        trackCache.set(spotifyId, playlistTracks)
      } catch {
        continue
      }
    }
    if (!playlistTracks.length) continue

    const analysis = analyzeLastfmPlaylistActivity(playlistTracks, scrobbles, {
      username,
      fromDate: range.fromDate,
      toDate: range.toDate,
    })

    const matchedCount = new Set(analysis.matched.map(m => m.playlistPosition)).size
    if (!isSuggestible(analysis.confidence, matchedCount)) continue

    const activityDate =
      analysis.primarySession?.startIso.slice(0, 10) || range.toDate

    suggestions.push({
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      playlistTitle: pl.title,
      playlistImageUrl: pl.image_url,
      memberId: row.memberId,
      matchedCount,
      playlistTrackCount: playlistTracks.length,
      scrobbleCount: scrobbles.length,
      completionPercent: analysis.completionPercent,
      confidence: analysis.confidence,
      clusterCount: analysis.clusterCount,
      sequenceMatches: analysis.sequenceMatches,
      sessions: analysis.sessions,
      sessionLabel: formatSessionLabel(analysis.primarySession),
      summaryText: analysis.summaryText,
      explanation: analysis.explanation,
      fromDate: range.fromDate,
      toDate: range.toDate,
      activityDate,
      headline: suggestionHeadline(campaign.title, analysis.confidence, matchedCount, analysis.clusterCount),
    })
  }

  suggestions.sort((a, b) => {
    if (opts.focusCampaignId) {
      if (a.campaignId === opts.focusCampaignId) return -1
      if (b.campaignId === opts.focusCampaignId) return 1
    }
    const cr = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence]
    if (cr !== 0) return cr
    return b.completionPercent - a.completionPercent
  })

  return {
    suggestions,
    scrobbleCount: scrobbles.length,
    fromDate: range.fromDate,
    toDate: range.toDate,
    campaignsScanned: rows.length,
  }
}
