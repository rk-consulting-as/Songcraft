import { NextRequest, NextResponse } from 'next/server'
import { requireUser, serviceClient } from '@/lib/playlistCommunities/apiAuth'
import { sanitizePublicMember } from '@/lib/playlistCommunities/serialize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PATCH_FIELDS = [
  'title', 'description', 'rules', 'genre', 'mood', 'commitment_level', 'max_members',
  'songs_per_member', 'active_days_per_week', 'campaign_start_date', 'campaign_end_date',
  'status', 'visibility', 'artist_id',
] as const

async function loadCampaign(sb: ReturnType<typeof serviceClient>, id: string) {
  const { data, error } = await sb.from('playlist_campaigns').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function enrichCampaign(sb: ReturnType<typeof serviceClient>, campaign: Record<string, unknown>, userId?: string) {
  const { data: playlist } = await sb
    .from('creator_playlists')
    .select('id, title, image_url, spotify_url, owner_name, visibility')
    .eq('id', campaign.playlist_id as string)
    .maybeSingle()

  const { data: members } = await sb
    .from('playlist_campaign_members')
    .select('id, status, user_id, artist_id, song_id, message, joined_at, updated_at')
    .eq('campaign_id', campaign.id as string)

  let artistName: string | null = null
  if (campaign.artist_id) {
    const { data: artist } = await sb.from('artists').select('name, page_slug').eq('id', campaign.artist_id).maybeSingle()
    artistName = artist?.name || null
  }

  const memberRows = members || []
  const isOwner = userId ? campaign.user_id === userId : false
  const myMembership = userId ? memberRows.find(m => m.user_id === userId) || null : null

  const artistIds = Array.from(new Set(memberRows.map(m => m.artist_id).filter(Boolean))) as string[]
  const songIds = Array.from(new Set(memberRows.map(m => m.song_id).filter(Boolean))) as string[]

  const [{ data: artists }, { data: songs }] = await Promise.all([
    artistIds.length ? sb.from('artists').select('id, name, page_slug').in('id', artistIds) : { data: [] },
    songIds.length
      ? sb.from('songs').select('id, title, public_hidden, spotify_url, suno_url').in('id', songIds)
      : { data: [] },
  ])

  const artistMap = Object.fromEntries((artists || []).map(a => [a.id, a]))
  const songMap = Object.fromEntries((songs || []).map(s => [s.id, s]))

  const canSeeAllMembers = isOwner || (myMembership && ['approved', 'requested'].includes(myMembership.status))
  const isPublicCampaign =
    campaign.visibility === 'public' &&
    ['open', 'active'].includes(campaign.status as string) &&
    !campaign.admin_hidden

  const visibleMembers = memberRows.filter(m => {
    if (isOwner) return true
    if (m.user_id === userId) return true
    if (isPublicCampaign && m.status === 'approved') return true
    return false
  })

  const membersOut = visibleMembers.map(m => {
    const artist = m.artist_id ? artistMap[m.artist_id] : null
    const song = m.song_id ? songMap[m.song_id] : null
    const songPublic = song && song.public_hidden === false
    const base = {
      ...m,
      artistName: artist?.name || null,
      songTitle: song?.title || null,
      songSpotifyUrl: isOwner || m.user_id === userId ? (song?.spotify_url || song?.suno_url || null) : null,
      songHref: songPublic && song?.id ? `/s/${song.id}` : null,
    }
    if (!isOwner && m.user_id !== userId) {
      return sanitizePublicMember({
        id: m.id,
        status: m.status,
        joined_at: m.joined_at,
        artist: artist ? { name: artist.name, page_slug: artist.page_slug } : null,
        song: song ? { id: song.id, title: song.title, public_hidden: song.public_hidden } : null,
      })
    }
    return base
  }).filter(Boolean)

  return {
    campaign: {
      ...campaign,
      playlist,
      artistName,
      memberCount: memberRows.length,
      approvedCount: memberRows.filter(m => m.status === 'approved').length,
      pendingCount: memberRows.filter(m => m.status === 'requested').length,
      isOwner,
      myMembership: myMembership ? { id: myMembership.id, status: myMembership.status } : null,
    },
    members: membersOut,
    isOwner,
    myMembership,
    canManage: isOwner,
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  const sb = auth?.sb || serviceClient()
  const userId = auth?.userId

  const campaign = await loadCampaign(sb, params.id)
  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const isPublic =
    campaign.visibility === 'public' &&
    ['open', 'active'].includes(campaign.status) &&
    !campaign.admin_hidden

  if (!isPublic && campaign.user_id !== userId) {
    if (!userId) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const { data: membership } = await sb
      .from('playlist_campaign_members')
      .select('id')
      .eq('campaign_id', params.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!membership) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const payload = await enrichCampaign(sb, campaign, userId)
  return NextResponse.json(payload)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  for (const key of PATCH_FIELDS) {
    if (body[key] !== undefined) patch[key] = body[key]
  }

  const { data, error } = await sb
    .from('playlist_campaigns')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ campaign: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req)
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  const { sb, userId } = auth

  const { data: campaign } = await sb
    .from('playlist_campaigns')
    .select('status')
    .eq('id', params.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!campaign) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (campaign.status !== 'archived') {
    return NextResponse.json({ error: 'archive_before_delete' }, { status: 400 })
  }

  const { error } = await sb.from('playlist_campaigns').delete().eq('id', params.id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
