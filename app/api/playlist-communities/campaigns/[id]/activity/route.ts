import { NextRequest, NextResponse } from 'next/server'
import { getUserPlan } from '@/lib/subscription'
import { requireUser } from '@/lib/playlistCommunities/apiAuth'
import { getApprovedMembership } from '@/lib/playlistCommunities/campaignAccess'
import { getActivityProofLimits } from '@/lib/playlistCommunities/activityLimits'
import { MEDIA_STORAGE_BUCKET } from '@/lib/mediaLibrary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const CSV_TYPES = new Set(['text/csv', 'application/vnd.ms-excel', 'application/csv'])

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const member = await getApprovedMembership(sb, params.id, userId)
  if (!member) return NextResponse.json({ error: 'not_approved_member' }, { status: 403 })

  const plan = await getUserPlan(sb, userId)
  const limits = getActivityProofLimits(plan.id)

  const form = await req.formData()
  const proofType = String(form.get('proof_type') || 'text') as 'image' | 'csv' | 'text'
  const proofText = form.get('proof_text') ? String(form.get('proof_text')).slice(0, 8000) : null
  const activityDate = form.get('activity_date')
    ? String(form.get('activity_date')).slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const file = form.get('file') as File | null

  if (proofType === 'image' && file && !limits.canUploadImage) {
    return NextResponse.json({ error: 'image_upload_pro', limits }, { status: 403 })
  }
  if (proofType === 'csv' && file && !limits.canUploadCsv) {
    return NextResponse.json({ error: 'csv_upload_pro', limits }, { status: 403 })
  }

  let proofAssetId: string | null = null

  if (file && (proofType === 'image' || proofType === 'csv')) {
    const isImage = IMAGE_TYPES.has(file.type)
    const isCsv = CSV_TYPES.has(file.type) || file.name.toLowerCase().endsWith('.csv')
    if (proofType === 'image' && !isImage) {
      return NextResponse.json({ error: 'invalid_image_type' }, { status: 400 })
    }
    if (proofType === 'csv' && !isCsv && !file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'invalid_csv_type' }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 8)
    const path = `${userId}/proofs/${params.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadErr } = await sb.storage
      .from(MEDIA_STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (uploadErr) {
      return NextResponse.json({ error: 'upload_failed', message: uploadErr.message }, { status: 500 })
    }
    const { data: pub } = sb.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(path)
    const { data: asset, error: assetErr } = await sb
      .from('media_assets')
      .insert({
        user_id: userId,
        artist_id: member.artist_id,
        song_id: member.song_id,
        campaign_id: params.id,
        type: 'activity_proof',
        title: `Activity proof ${activityDate}`,
        file_url: pub.publicUrl,
        thumbnail_url: isImage ? pub.publicUrl : null,
        mime_type: file.type,
        size_bytes: file.size,
        visibility: 'private',
        usage: { activity_proof: true },
      })
      .select('id')
      .single()
    if (assetErr) {
      return NextResponse.json({ error: assetErr.message }, { status: 500 })
    }
    proofAssetId = asset.id
  }

  if (proofType === 'text' && !proofText?.trim()) {
    return NextResponse.json({ error: 'proof_text_required' }, { status: 400 })
  }

  const row = {
    campaign_id: params.id,
    member_id: member.id,
    user_id: userId,
    artist_id: member.artist_id,
    song_id: member.song_id,
    activity_date: activityDate,
    status: 'submitted' as const,
    proof_type: proofType,
    proof_asset_id: proofAssetId,
    proof_text: proofText,
  }

  const { data, error } = await sb
    .from('campaign_activity_logs')
    .upsert(row, { onConflict: 'member_id,activity_date' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data })
}
