import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { safeGetUserPlan } from '@/lib/subscription/safePlan'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { canAccessParticipation } from '@/lib/playlistCommunities/campaignAccess'
import { getActivityProofLimits, canUseAiReview } from '@/lib/playlistCommunities/activityLimits'
import {
  buildParticipationBoard,
  countPendingReviews,
  getWeekDates,
  formatDateYmd,
} from '@/lib/playlistCommunities/participationBoard'
import type { CampaignActivityLog } from '@/lib/playlistCommunities/activityTypes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function attachProofUrls(sb: SupabaseClient, logs: Record<string, unknown>[]) {
  const assetIds = logs.map(l => l.proof_asset_id).filter(Boolean) as string[]
  if (!assetIds.length) return logs
  const { data: assets } = await sb.from('media_assets').select('id, file_url').in('id', assetIds)
  const map = Object.fromEntries((assets || []).map(a => [a.id, a.file_url]))
  return logs.map(l => ({
    ...l,
    proofAssetUrl: l.proof_asset_id ? map[l.proof_asset_id as string] || null : null,
  }))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const access = await canAccessParticipation(sb, params.id, userId)
  if (!access.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const plan = await safeGetUserPlan(sb, userId)
  const limits = getActivityProofLimits(plan.id)

  const { data: members } = await sb
    .from('playlist_campaign_members')
    .select('id, artist_id, song_id, user_id, status')
    .eq('campaign_id', params.id)
    .eq('status', 'approved')

  const memberIds = (members || []).map(m => m.id)
  const artistIds = Array.from(new Set((members || []).map(m => m.artist_id).filter(Boolean))) as string[]
  const songIds = Array.from(new Set((members || []).map(m => m.song_id).filter(Boolean))) as string[]

  const [{ data: artists }, { data: songs }, { data: logsRaw }] = await Promise.all([
    artistIds.length ? sb.from('artists').select('id, name, page_slug').in('id', artistIds) : { data: [] },
    songIds.length ? sb.from('songs').select('id, title, public_hidden').in('id', songIds) : { data: [] },
    memberIds.length
      ? sb.from('campaign_activity_logs').select('*').eq('campaign_id', params.id).order('activity_date', { ascending: false })
      : { data: [] },
  ])

  const artistMap = Object.fromEntries((artists || []).map(a => [a.id, a]))
  const songMap = Object.fromEntries((songs || []).map(s => [s.id, s]))

  const logs = (await attachProofUrls(sb, (logsRaw || []) as Record<string, unknown>[])) as CampaignActivityLog[]
  const weekDates = getWeekDates()
  const todayStr = formatDateYmd(new Date())

  const boardMembers = (members || []).map(m => {
    const artist = m.artist_id ? artistMap[m.artist_id] : null
    const song = m.song_id ? songMap[m.song_id] : null
    return {
      id: m.id,
      artistName: artist?.name || null,
      songTitle: song?.title || null,
      songHref: song && song.public_hidden === false ? `/s/${song.id}` : null,
    }
  })

  const board = buildParticipationBoard(boardMembers, logs, weekDates, todayStr)
  const myMember = (members || []).find(m => m.user_id === userId)
  const myLogs = logs.filter(l => l.user_id === userId)

  return NextResponse.json({
    logs,
    board,
    weekDates,
    myLogs,
    myMemberId: myMember?.id || null,
    pendingReviewCount: access.role === 'owner' ? countPendingReviews(logs) : 0,
    stats: {
      totalApproved: logs.filter(l => l.status === 'approved').length,
      totalSubmitted: logs.filter(l => l.status === 'submitted').length,
      membersNeedingAttention: board.filter(b => b.currentStatus === 'needs_attention' || b.pendingCount > 0).length,
    },
    limits: { ...limits, canUseAiReview: canUseAiReview(plan.id) },
    planId: plan.id,
    role: access.role,
  })
}
