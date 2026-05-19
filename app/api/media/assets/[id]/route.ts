import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MEDIA_ASSET_TYPES, type MediaAssetType } from '@/lib/mediaLibrary/types'
import { MEDIA_STORAGE_BUCKET } from '@/lib/mediaLibrary'
import { mergeUsageFlags, type MediaUsageFlag } from '@/lib/mediaLibrary/usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
  return { sb, user }
}

function storagePathFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const marker = `/storage/v1/object/public/${MEDIA_STORAGE_BUCKET}/`
    const idx = u.pathname.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(u.pathname.slice(idx + marker.length))
  } catch {
    return null
  }
}

// PATCH /api/media/assets/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, user } = auth
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  if (typeof body.title === 'string') updates.title = body.title.slice(0, 200)
  if (typeof body.description === 'string') updates.description = body.description.slice(0, 2000)
  if (body.visibility === 'public' || body.visibility === 'private') updates.visibility = body.visibility
  if (typeof body.is_featured === 'boolean') updates.is_featured = body.is_featured
  if (Array.isArray(body.tags)) updates.tags = body.tags.map(String).slice(0, 20)
  if (body.type && MEDIA_ASSET_TYPES.includes(body.type as MediaAssetType)) updates.type = body.type
  if (body.usage && typeof body.usage === 'object') updates.usage = body.usage

  if (Array.isArray(body.merge_usage_flags) && body.merge_usage_flags.length) {
    const { data: existing } = await sb
      .from('media_assets')
      .select('usage')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    const flags = body.merge_usage_flags.filter((f: string) =>
      ['used_in_epk', 'used_in_campaign', 'used_in_public_page', 'used_as_cover', 'used_as_brand_kit'].includes(f)
    ) as MediaUsageFlag[]
    updates.usage = mergeUsageFlags((existing?.usage as Record<string, boolean>) || {}, flags)
  }

  if (body.is_featured === true && body.artist_id) {
    await sb
      .from('media_assets')
      .update({ is_featured: false })
      .eq('user_id', user.id)
      .eq('artist_id', body.artist_id)
      .neq('id', id)
  }

  const { data, error } = await sb
    .from('media_assets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ asset: data })
}

// DELETE /api/media/assets/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, user } = auth
  const { id } = await params

  const { data: row } = await sb
    .from('media_assets')
    .select('file_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { error } = await sb.from('media_assets').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const path = storagePathFromUrl(row.file_url)
  if (path) await sb.storage.from(MEDIA_STORAGE_BUCKET).remove([path]).catch(() => {})

  return NextResponse.json({ ok: true })
}
