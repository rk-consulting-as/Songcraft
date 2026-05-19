import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserPlan } from '@/lib/subscription'
import { getMediaLibraryLimits } from '@/lib/mediaLibrary/limits'
import { MEDIA_ASSET_TYPES, type MediaAssetType } from '@/lib/mediaLibrary/types'
import { MEDIA_STORAGE_BUCKET } from '@/lib/mediaLibrary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])

function authClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  )
}

async function requireUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const sb = authClient(token)
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  return { sb, user, token }
}

function normalizeRow(row: Record<string, unknown>) {
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
    usage: row.usage && typeof row.usage === 'object' ? row.usage : {},
  }
}

// GET /api/media/assets?artist_id=&type=&visibility=&q=&limit=
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, user } = auth

  const sp = req.nextUrl.searchParams
  const artistId = sp.get('artist_id')
  const type = sp.get('type')
  const visibility = sp.get('visibility')
  const q = sp.get('q')?.trim()
  const limit = Math.min(parseInt(sp.get('limit') || '100', 10) || 100, 200)

  let query = sb
    .from('media_assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (artistId) query = query.eq('artist_id', artistId)
  if (type && MEDIA_ASSET_TYPES.includes(type as MediaAssetType)) query = query.eq('type', type)
  if (visibility === 'public' || visibility === 'private') query = query.eq('visibility', visibility)
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const plan = await getUserPlan(sb, user.id)
  const limits = getMediaLibraryLimits(plan.id)

  return NextResponse.json({
    assets: (data || []).map(normalizeRow),
    limits,
    planId: plan.id,
  })
}

// POST /api/media/assets  multipart: file, type, title?, description?, artist_id?, song_id?, visibility?, tags?
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, user } = auth

  const plan = await getUserPlan(sb, user.id)
  const limits = getMediaLibraryLimits(plan.id)

  const { count } = await sb
    .from('media_assets')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) >= limits.maxAssets) {
    return NextResponse.json({ error: 'asset_limit', limits }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 })
  if (!IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'unsupported_type', mime: file.type }, { status: 400 })
  }
  if (file.size > limits.maxFileBytes) {
    return NextResponse.json({ error: 'too_large', max: limits.maxFileBytes }, { status: 400 })
  }

  const typeRaw = String(form.get('type') || 'promo_image')
  const type = MEDIA_ASSET_TYPES.includes(typeRaw as MediaAssetType) ? typeRaw : 'promo_image'
  const title = String(form.get('title') || file.name || 'Untitled').slice(0, 200)
  const description = form.get('description') ? String(form.get('description')).slice(0, 2000) : null
  const artistId = form.get('artist_id') ? String(form.get('artist_id')) : null
  const songId = form.get('song_id') ? String(form.get('song_id')) : null
  const visibility = form.get('visibility') === 'public' ? 'public' : 'private'

  let tags: string[] = []
  const tagsRaw = form.get('tags')
  if (tagsRaw) {
    try {
      const parsed = JSON.parse(String(tagsRaw))
      if (Array.isArray(parsed)) tags = parsed.map(String).slice(0, 20)
    } catch { /* ignore */ }
  }

  if (artistId) {
    const { data: artist } = await sb.from('artists').select('id').eq('id', artistId).eq('user_id', user.id).maybeSingle()
    if (!artist) return NextResponse.json({ error: 'invalid_artist' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8)
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await sb.storage
    .from(MEDIA_STORAGE_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })
  if (uploadErr) {
    return NextResponse.json({ error: 'upload_failed', message: uploadErr.message }, { status: 500 })
  }

  const { data: pub } = sb.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(path)
  const fileUrl = pub.publicUrl

  const { data: row, error: insertErr } = await sb
    .from('media_assets')
    .insert({
      user_id: user.id,
      artist_id: artistId,
      song_id: songId,
      type,
      title,
      description,
      tags,
      file_url: fileUrl,
      thumbnail_url: fileUrl,
      mime_type: file.type,
      size_bytes: file.size,
      visibility,
      usage: {},
    })
    .select('*')
    .single()

  if (insertErr) {
    await sb.storage.from(MEDIA_STORAGE_BUCKET).remove([path]).catch(() => {})
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ asset: normalizeRow(row as Record<string, unknown>) })
}
