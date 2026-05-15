import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/messages/upload  (multipart/form-data)
// Form field: file
// Returns: { url, name, size, mime, type: 'image'|'audio'|'document' }

const MAX_SIZE = 50 * 1024 * 1024  // 50 MB
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'])
const DOC_TYPES   = new Set([
  'application/pdf', 'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
])

function classify(mime: string): 'image' | 'audio' | 'document' | null {
  if (IMAGE_TYPES.has(mime)) return 'image'
  if (AUDIO_TYPES.has(mime)) return 'audio'
  if (DOC_TYPES.has(mime))   return 'document'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
    )
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'no_file' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'too_large', max: MAX_SIZE }, { status: 400 })

    const kind = classify(file.type)
    if (!kind) return NextResponse.json({ error: 'unsupported_type', mime: file.type }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().slice(0, 10)
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await sb.storage
      .from('chat-attachments')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadErr) {
      console.error('[messages/upload] upload failed:', uploadErr.message)
      return NextResponse.json({ error: 'upload_failed', message: uploadErr.message }, { status: 500 })
    }

    const { data: pub } = sb.storage.from('chat-attachments').getPublicUrl(path)
    return NextResponse.json({
      url: pub.publicUrl,
      name: file.name,
      size: file.size,
      mime: file.type,
      type: kind,
    })
  } catch (e: any) {
    console.error('[messages/upload] crashed:', e?.message)
    return NextResponse.json({ error: 'crashed', message: e?.message || String(e) }, { status: 500 })
  }
}
