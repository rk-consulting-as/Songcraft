import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

export async function GET(req: NextRequest) {
  const sb = serviceClient()
  const sp = req.nextUrl.searchParams
  const genre = sp.get('genre')?.trim()
  const mood = sp.get('mood')?.trim()
  const commitment = sp.get('commitment')?.trim()
  const sort = sp.get('sort') || 'newest'
  const lookingForMembers = sp.get('looking_for_members') === '1'
  const limit = Math.min(parseInt(sp.get('limit') || '48', 10) || 48, 100)

  let query = sb
    .from('playlist_campaigns')
    .select(
      'id, title, description, rules, genre, mood, commitment_level, status, visibility, max_members, created_at, artist_id, playlist_id, user_id'
    )
    .eq('visibility', 'public')
    .in('status', ['open', 'active'])
    .eq('admin_hidden', false)

  if (genre) query = query.ilike('genre', genre)
  if (mood) query = query.ilike('mood', mood)
  if (commitment && ['flexible', 'standard', 'dedicated'].includes(commitment)) {
    query = query.eq('commitment_level', commitment)
  }

  const { data: rows, error } = await query.order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (rows || []).map(r => r.id)
  const playlistIds = Array.from(new Set((rows || []).map(r => r.playlist_id)))
  const artistIds = Array.from(new Set((rows || []).map(r => r.artist_id).filter(Boolean))) as string[]

  const [{ data: playlists }, { data: artists }, { data: members }, { data: activity }] = await Promise.all([
    playlistIds.length
      ? sb.from('creator_playlists').select('id, title, image_url, spotify_url').in('id', playlistIds)
      : { data: [] },
    artistIds.length ? sb.from('artists').select('id, name').in('id', artistIds) : { data: [] },
    ids.length
      ? sb.from('playlist_campaign_members').select('campaign_id, status').in('campaign_id', ids)
      : { data: [] },
    ids.length
      ? sb
          .from('campaign_activity_logs')
          .select('campaign_id')
          .in('campaign_id', ids)
          .eq('status', 'approved')
      : { data: [] },
  ])

  const plMap = Object.fromEntries((playlists || []).map(p => [p.id, p]))
  const artistMap = Object.fromEntries((artists || []).map(a => [a.id, a.name]))
  const memberCounts: Record<string, number> = {}
  for (const m of members || []) {
    if (m.status === 'approved') memberCounts[m.campaign_id] = (memberCounts[m.campaign_id] || 0) + 1
  }
  const activityCounts: Record<string, number> = {}
  for (const a of activity || []) {
    activityCounts[a.campaign_id] = (activityCounts[a.campaign_id] || 0) + 1
  }

  let campaigns = (rows || []).map(c => {
    const pl = plMap[c.playlist_id]
    const count = memberCounts[c.id] || 0
    const atCapacity = c.max_members != null && count >= c.max_members
    return {
      ...c,
      playlist: pl,
      artistName: c.artist_id ? artistMap[c.artist_id] || null : null,
      memberCount: count,
      approvedCount: count,
      approvedThisWeek: activityCounts[c.id] || 0,
      activityThisWeek: activityCounts[c.id] || 0,
      isLookingForMembers: !atCapacity,
      isOwner: false,
    }
  })

  if (lookingForMembers) {
    campaigns = campaigns.filter(c => c.isLookingForMembers)
  }

  if (sort === 'trending') {
    campaigns.sort((a, b) => (b.memberCount + b.approvedThisWeek * 2) - (a.memberCount + a.approvedThisWeek * 2))
  } else {
    campaigns.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  }

  const genres = Array.from(new Set((rows || []).map(r => r.genre).filter(Boolean))) as string[]
  const moods = Array.from(new Set((rows || []).map(r => r.mood).filter(Boolean))) as string[]

  return NextResponse.json({
    campaigns: campaigns.slice(0, limit),
    filters: { genres, moods },
  })
}
