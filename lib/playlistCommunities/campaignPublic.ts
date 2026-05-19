import { createClient } from '@supabase/supabase-js'
import { rulesSummary } from './serialize'

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}

export type PublicCampaignOg = {
  title: string
  description: string
  image: string | null
  hostName: string | null
  playlistTitle: string | null
  rulesSummary: string | null
  isPublic: boolean
}

export async function fetchPublicCampaignOg(campaignId: string): Promise<PublicCampaignOg | null> {
  const sb = serviceClient()
  const { data: campaign } = await sb
    .from('playlist_campaigns')
    .select('id, title, description, rules, status, visibility, admin_hidden, artist_id, playlist_id')
    .eq('id', campaignId)
    .maybeSingle()

  if (!campaign) return null

  const isPublic =
    campaign.visibility === 'public' &&
    ['open', 'active'].includes(campaign.status) &&
    !campaign.admin_hidden

  const [{ data: playlist }, { data: artist }] = await Promise.all([
    sb.from('creator_playlists').select('title, image_url').eq('id', campaign.playlist_id).maybeSingle(),
    campaign.artist_id
      ? sb.from('artists').select('name').eq('id', campaign.artist_id).maybeSingle()
      : { data: null },
  ])

  const hostName = artist?.name || null
  const rules = rulesSummary(campaign.rules, 160)
  const descParts = [
    hostName ? `Hosted by ${hostName}` : null,
    playlist?.title ? `Playlist: ${playlist.title}` : null,
    rules ? rules : null,
    'Creator collaboration on ViaTone — participation evidence, not stream verification.',
  ].filter(Boolean)

  return {
    title: campaign.title,
    description: descParts.join(' · '),
    image: playlist?.image_url || null,
    hostName,
    playlistTitle: playlist?.title || null,
    rulesSummary: rules,
    isPublic,
  }
}
