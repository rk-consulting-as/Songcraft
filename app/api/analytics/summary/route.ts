import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/analytics/summary?days=30&artist_id=...
// Returns aggregated KPIs + daily time series + top songs across all songs owned by the user.
// RLS gates everything by user — a user only sees their own data.

type DailyBucket = { date: string; plays: number; clicks: number; comments: number; reactions: number }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '30', 10)))
    const artistIdFilter = searchParams.get('artist_id')

    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const token = auth.slice(7)

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    )

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const sinceDate = new Date(Date.now() - days * 86400000)
    const sinceIso = sinceDate.toISOString()

    // 1. Get user's artists + songs (RLS will filter)
    let artistsQuery = sb.from('artists').select('id, name').eq('user_id', user.id)
    const { data: artists } = await artistsQuery

    let songsQuery = sb.from('songs').select('id, title, artist_id, internal_play_count, embed_click_count, comment_count, reaction_count, cover_image_url, spotify_cover_url').eq('user_id', user.id)
    if (artistIdFilter) songsQuery = songsQuery.eq('artist_id', artistIdFilter)
    const { data: songs } = await songsQuery
    const songIds = (songs || []).map(s => s.id)

    if (songIds.length === 0) {
      return NextResponse.json({
        days,
        kpis: { plays: 0, clicks: 0, comments: 0, reactions: 0, followers: 0, songs: 0 },
        daily: [],
        topSongs: [],
        platformBreakdown: {},
        sourceBreakdown: {},
        engagementRate: 0,
        clickThroughRate: 0,
        bestDay: null,
        artists: artists || [],
      })
    }

    // 2. Fetch all events in range (in parallel)
    const [playsRes, clicksRes, commentsRes, reactionsRes, followsRes] = await Promise.all([
      sb.from('song_plays').select('song_id, source, created_at').in('song_id', songIds).gte('created_at', sinceIso),
      sb.from('link_clicks').select('song_id, target_type, created_at').in('song_id', songIds).gte('created_at', sinceIso),
      sb.from('song_comments').select('song_id, created_at').in('song_id', songIds).gte('created_at', sinceIso),
      sb.from('song_reactions').select('song_id, created_at').in('song_id', songIds).gte('created_at', sinceIso),
      sb.from('follows').select('following_id, created_at').eq('following_id', user.id).gte('created_at', sinceIso),
    ])

    const plays = playsRes.data || []
    const clicks = clicksRes.data || []
    const comments = commentsRes.data || []
    const reactions = reactionsRes.data || []
    const follows = followsRes.data || []

    // 3. Daily buckets
    const dailyMap = new Map<string, DailyBucket>()
    const formatDate = (d: Date) => d.toISOString().slice(0, 10)
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000)
      const key = formatDate(d)
      dailyMap.set(key, { date: key, plays: 0, clicks: 0, comments: 0, reactions: 0 })
    }
    for (const p of plays) {
      const key = (p.created_at || '').slice(0, 10)
      const b = dailyMap.get(key); if (b) b.plays++
    }
    for (const c of clicks) {
      const key = (c.created_at || '').slice(0, 10)
      const b = dailyMap.get(key); if (b) b.clicks++
    }
    for (const c of comments) {
      const key = (c.created_at || '').slice(0, 10)
      const b = dailyMap.get(key); if (b) b.comments++
    }
    for (const r of reactions) {
      const key = (r.created_at || '').slice(0, 10)
      const b = dailyMap.get(key); if (b) b.reactions++
    }
    const daily = Array.from(dailyMap.values())

    // 4. Top songs (by combined engagement in range)
    const songStats = new Map<string, { plays: number; clicks: number; comments: number; reactions: number }>()
    for (const s of songIds) songStats.set(s, { plays: 0, clicks: 0, comments: 0, reactions: 0 })
    for (const p of plays) { const st = songStats.get(p.song_id); if (st) st.plays++ }
    for (const c of clicks) { const st = songStats.get(c.song_id || ''); if (st) st.clicks++ }
    for (const c of comments) { const st = songStats.get(c.song_id); if (st) st.comments++ }
    for (const r of reactions) { const st = songStats.get(r.song_id); if (st) st.reactions++ }

    const topSongs = (songs || []).map(s => {
      const st = songStats.get(s.id) || { plays: 0, clicks: 0, comments: 0, reactions: 0 }
      const score = st.plays + st.clicks * 2 + st.comments * 5 + st.reactions * 3
      return { ...s, ...st, score }
    }).sort((a, b) => b.score - a.score).slice(0, 10)

    // 5. Platform breakdown (clicks)
    const platformBreakdown: Record<string, number> = {}
    for (const c of clicks) {
      const t = c.target_type || 'other'
      platformBreakdown[t] = (platformBreakdown[t] || 0) + 1
    }

    // 6. Source breakdown (plays)
    const sourceBreakdown: Record<string, number> = {}
    for (const p of plays) {
      const s = p.source || 'unknown'
      sourceBreakdown[s] = (sourceBreakdown[s] || 0) + 1
    }

    // 7. Totals + rates
    const totalPlays = plays.length
    const totalClicks = clicks.length
    const totalComments = comments.length
    const totalReactions = reactions.length

    const engagementRate = totalPlays > 0
      ? Math.round(((totalComments + totalReactions) / totalPlays) * 1000) / 10
      : 0
    const clickThroughRate = totalPlays > 0
      ? Math.round((totalClicks / totalPlays) * 1000) / 10
      : 0

    // 8. Best day
    let bestDay: DailyBucket | null = null
    let bestScore = -1
    for (const d of daily) {
      const s = d.plays + d.clicks * 2 + d.comments * 5 + d.reactions * 3
      if (s > bestScore) { bestScore = s; bestDay = d }
    }
    if (bestScore <= 0) bestDay = null

    return NextResponse.json({
      days,
      kpis: {
        plays: totalPlays,
        clicks: totalClicks,
        comments: totalComments,
        reactions: totalReactions,
        followers: follows.length,
        songs: songIds.length,
      },
      daily,
      topSongs,
      platformBreakdown,
      sourceBreakdown,
      engagementRate,
      clickThroughRate,
      bestDay,
      artists: artists || [],
    })
  } catch (e: any) {
    console.error('[analytics/summary] crashed:', e?.message)
    return NextResponse.json({ error: 'crashed', message: e?.message }, { status: 500 })
  }
}
