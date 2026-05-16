import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/link/stats?song_id=... or ?artist_id=...
// Returns aggregated click stats grouped by target_type.
// RLS ensures only the owner (or admin) can read their own data.

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const songId = searchParams.get('song_id')
    const artistId = searchParams.get('artist_id')

    if (!songId && !artistId) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 })
    }

    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    const token = auth.slice(7)

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    )

    let query = sb.from('link_clicks').select('target_type, target_url, created_at, source_page')
    if (songId) query = query.eq('song_id', songId)
    if (artistId) query = query.eq('artist_id', artistId)

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000)
    if (error) {
      return NextResponse.json({ error: 'query_failed', message: error.message }, { status: 500 })
    }

    const rows = data || []
    const total = rows.length
    const byType: Record<string, number> = {}
    const byUrl: Record<string, { count: number; type: string }> = {}
    const last30: number[] = new Array(30).fill(0)
    const now = Date.now()

    for (const r of rows) {
      byType[r.target_type] = (byType[r.target_type] || 0) + 1
      if (!byUrl[r.target_url]) byUrl[r.target_url] = { count: 0, type: r.target_type }
      byUrl[r.target_url].count++
      const ageDays = Math.floor((now - new Date(r.created_at).getTime()) / 86400000)
      if (ageDays >= 0 && ageDays < 30) last30[29 - ageDays]++
    }

    const topUrls = Object.entries(byUrl)
      .map(([url, v]) => ({ url, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({
      total,
      byType,
      topUrls,
      last30,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'crashed', message: e?.message }, { status: 500 })
  }
}
