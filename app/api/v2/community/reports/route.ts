import { NextRequest, NextResponse } from 'next/server'
import { clipText, requireV2User } from '@/lib/v2/apiAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TARGETS = new Set(['circle', 'session', 'song', 'playlist_room'])

export async function POST(req: NextRequest) {
  const auth = await requireV2User(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const targetType = TARGETS.has(body.target_type) ? body.target_type : null
  const targetId = typeof body.target_id === 'string' ? body.target_id : ''
  const reason = clipText(body.reason, 1000)

  if (!targetType || !targetId) return NextResponse.json({ error: 'invalid_target' }, { status: 400 })

  const { data, error } = await sb
    .from('v2_community_reports')
    .insert({ reporter_id: userId, target_type: targetType, target_id: targetId, reason: reason || null })
    .select('id, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ report: data })
}
