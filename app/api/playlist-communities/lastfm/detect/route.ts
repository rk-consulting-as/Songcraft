import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { detectLastfmAcrossCampaigns } from '@/lib/lastfm/detectSuggestions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  let lastfmUsername = String(body.lastfm_username || '').trim()

  if (!lastfmUsername) {
    const { data: profile } = await sb.from('profiles').select('lastfm_username').eq('id', userId).maybeSingle()
    lastfmUsername = profile?.lastfm_username?.trim() || ''
  }

  if (!lastfmUsername) {
    return NextResponse.json({ error: 'lastfm_username_required' }, { status: 400 })
  }

  const fromDate = body.from_date ? String(body.from_date).slice(0, 10) : undefined
  const toDate = body.to_date ? String(body.to_date).slice(0, 10) : undefined
  const focusCampaignId = body.campaign_id ? String(body.campaign_id) : undefined

  try {
    const result = await detectLastfmAcrossCampaigns(sb, userId, {
      lastfmUsername,
      fromDate,
      toDate,
      focusCampaignId,
    })

    await sb
      .from('profiles')
      .update({ lastfm_username: lastfmUsername, updated_at: new Date().toISOString() })
      .eq('id', userId)

    return NextResponse.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'lastfm_detect_failed'
    const status =
      msg === 'lastfm_not_configured'
        ? 503
        : msg === 'invalid_date_range' || msg === 'date_range_too_long'
          ? 400
          : msg.includes('not found')
            ? 404
            : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
