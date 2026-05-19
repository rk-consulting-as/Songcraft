import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserPlan } from '@/lib/subscription'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { getPlaylistCommunityLimits } from '@/lib/playlistCommunities/limits'
import { getWeekDates } from '@/lib/playlistCommunities/participationBoard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function attachCounts(sb: SupabaseClient, campaigns: Record<string, unknown>[]) {
  if (!campaigns.length) return campaigns
  const ids = campaigns.map(c => c.id as string)
  const { data: members } = await sb
    .from('playlist_campaign_members')
    .select('campaign_id, status')
    .in('campaign_id', ids)

  const counts: Record<string, { total: number; approved: number; pending: number }> = {}
  for (const id of ids) counts[id] = { total: 0, approved: 0, pending: 0 }
  for (const m of members || []) {
    const c = counts[m.campaign_id]
    if (!c) continue
    c.total += 1
    if (m.status === 'approved') c.approved += 1
    if (m.status === 'requested') c.pending += 1
  }

  const weekDates = getWeekDates()
  const weekSet = new Set(weekDates)
  const { data: activityLogs } = await sb
    .from('campaign_activity_logs')
    .select('campaign_id, status, activity_date')
    .in('campaign_id', ids)

  const proofStats: Record<string, { pending: number; approvedWeek: number }> = {}
  for (const id of ids) proofStats[id] = { pending: 0, approvedWeek: 0 }
  for (const log of activityLogs || []) {
    const s = proofStats[log.campaign_id]
    if (!s) continue
    if (log.status === 'submitted' || log.status === 'pending') s.pending += 1
    if (log.status === 'approved' && weekSet.has(log.activity_date)) s.approvedWeek += 1
  }

  const playlistIds = Array.from(new Set(campaigns.map(c => c.playlist_id as string)))
  const { data: playlists } = await sb.from('creator_playlists').select('id, title, image_url, spotify_url, owner_name').in('id', playlistIds)
  const playlistMap = Object.fromEntries((playlists || []).map(p => [p.id, p]))

  const artistIds = campaigns.map(c => c.artist_id).filter(Boolean) as string[]
  let artistMap: Record<string, { name: string }> = {}
  if (artistIds.length) {
    const { data: artists } = await sb.from('artists').select('id, name').in('id', artistIds)
    artistMap = Object.fromEntries((artists || []).map(a => [a.id, a]))
  }

  return campaigns.map(c => {
    const cc = counts[c.id as string] || { total: 0, approved: 0, pending: 0 }
    const pl = playlistMap[c.playlist_id as string]
    const ps = proofStats[c.id as string] || { pending: 0, approvedWeek: 0 }
    return {
      ...c,
      playlist: pl,
      memberCount: cc.total,
      approvedCount: cc.approved,
      pendingCount: cc.pending,
      pendingProofCount: ps.pending,
      approvedThisWeek: ps.approvedWeek,
      artistName: c.artist_id ? artistMap[c.artist_id as string]?.name || null : null,
    }
  })
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const artistId = req.nextUrl.searchParams.get('artist_id')
  const scope = req.nextUrl.searchParams.get('scope') || 'all'

  const plan = await getUserPlan(sb, userId)
  const limits = getPlaylistCommunityLimits(plan.id)

  let owned: Record<string, unknown>[] = []
  let joined: Record<string, unknown>[] = []

  let ownedQuery = sb.from('playlist_campaigns').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (artistId) ownedQuery = ownedQuery.eq('artist_id', artistId)
  const { data: ownedRows } = await ownedQuery
  owned = (ownedRows || []).map(r => ({ ...r, isOwner: true }))

  if (scope === 'joined' || scope === 'all') {
    const { data: memberRows } = await sb
      .from('playlist_campaign_members')
      .select('campaign_id, status, id')
      .eq('user_id', userId)
      .neq('status', 'removed')

    const campaignIds = Array.from(new Set((memberRows || []).map(m => m.campaign_id).filter(id => !owned.some(o => o.id === id))))
    if (campaignIds.length) {
      const { data: joinedRows } = await sb.from('playlist_campaigns').select('*').in('id', campaignIds)
      const memberMap = Object.fromEntries((memberRows || []).map(m => [m.campaign_id, m]))
      joined = (joinedRows || []).map(r => ({
        ...r,
        isOwner: false,
        myMembership: memberMap[r.id] ? { id: memberMap[r.id].id, status: memberMap[r.id].status } : null,
      }))
    }
  }

  const list = scope === 'owned' ? owned : scope === 'joined' ? joined : [...owned, ...joined]
  const enriched = await attachCounts(sb, list)

  return NextResponse.json({ campaigns: enriched, limits, planId: plan.id })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const plan = await getUserPlan(sb, userId)
  const limits = getPlaylistCommunityLimits(plan.id)

  const { count } = await sb
    .from('playlist_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count || 0) >= limits.maxCampaigns) {
    return NextResponse.json({ error: 'campaign_limit_reached', limits }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const playlistId = body.playlist_id
  if (!playlistId) return NextResponse.json({ error: 'playlist_id_required' }, { status: 400 })

  const { data: playlist } = await sb.from('creator_playlists').select('id').eq('id', playlistId).eq('user_id', userId).maybeSingle()
  if (!playlist) return NextResponse.json({ error: 'playlist_not_found' }, { status: 404 })

  const row = {
    user_id: userId,
    artist_id: body.artist_id || null,
    playlist_id: playlistId,
    title: String(body.title || '').trim() || 'Playlist community',
    description: body.description || null,
    rules: body.rules || null,
    genre: body.genre || null,
    mood: body.mood || null,
    commitment_level: ['flexible', 'standard', 'dedicated'].includes(body.commitment_level) ? body.commitment_level : 'standard',
    max_members: body.max_members ?? null,
    songs_per_member: Math.max(1, parseInt(String(body.songs_per_member || 1), 10) || 1),
    active_days_per_week: body.active_days_per_week ?? null,
    campaign_start_date: body.campaign_start_date || null,
    campaign_end_date: body.campaign_end_date || null,
    status: ['draft', 'open', 'active', 'closed', 'archived'].includes(body.status) ? body.status : 'draft',
    visibility: ['private', 'public', 'unlisted'].includes(body.visibility) ? body.visibility : 'private',
  }

  const { data, error } = await sb.from('playlist_campaigns').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign: data, limits })
}
