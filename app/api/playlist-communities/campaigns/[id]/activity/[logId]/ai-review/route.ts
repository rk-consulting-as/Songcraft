import { NextRequest, NextResponse } from 'next/server'
import { getUserPlan } from '@/lib/subscription'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { isCampaignOwner } from '@/lib/playlistCommunities/campaignAccess'
import { canUseAiReview } from '@/lib/playlistCommunities/activityLimits'
import {
  buildProofReviewSystemPrompt,
  buildProofReviewUserMessage,
  parseAiReviewResponse,
} from '@/lib/playlistCommunities/activityAiReview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function callAnthropic(system: string, userMessage: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `Anthropic ${res.status}`)
  return data.content?.find((b: { type: string }) => b.type === 'text')?.text || ''
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; logId: string } }
) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const owner = await isCampaignOwner(sb, params.id, userId)
  if (!owner) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const plan = await getUserPlan(sb, userId)
  if (!canUseAiReview(plan.id)) {
    return NextResponse.json({ error: 'ai_review_pro' }, { status: 403 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 })
  }

  const { data: log } = await sb
    .from('campaign_activity_logs')
    .select('*')
    .eq('id', params.logId)
    .eq('campaign_id', params.id)
    .maybeSingle()

  if (!log) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  let artistName: string | null = null
  let songTitle: string | null = null
  if (log.artist_id) {
    const { data: a } = await sb.from('artists').select('name').eq('id', log.artist_id).maybeSingle()
    artistName = a?.name || null
  }
  if (log.song_id) {
    const { data: s } = await sb.from('songs').select('title').eq('id', log.song_id).maybeSingle()
    songTitle = s?.title || null
  }

  const userMessage = buildProofReviewUserMessage({
    proofType: log.proof_type,
    proofText: log.proof_text,
    activityDate: log.activity_date,
    memberArtist: artistName,
    songTitle,
    hasImage: !!log.proof_asset_id,
  })

  try {
    const raw = await callAnthropic(buildProofReviewSystemPrompt(), userMessage)
    const { summary, confidence } = parseAiReviewResponse(raw)

    const { data: updated, error } = await sb
      .from('campaign_activity_logs')
      .update({
        ai_summary: summary,
        ai_confidence: confidence,
      })
      .eq('id', params.logId)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ log: updated, disclaimer: 'activity_evidence_not_stream_verification' })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'AI review failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
