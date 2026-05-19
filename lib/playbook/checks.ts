import type { PlaybookContext } from './types'

export type PlaybookCheckFn = (ctx: PlaybookContext) => boolean

function primaryArtist(ctx: PlaybookContext) {
  if (ctx.selectedArtistId) {
    return ctx.artists.find(a => a.id === ctx.selectedArtistId) || ctx.artists[0] || null
  }
  return ctx.artists[0] || null
}

function artistSongs(ctx: PlaybookContext, artistId?: string) {
  if (!artistId) return ctx.songs
  return ctx.songs.filter(s => s.artist_id === artistId)
}

function hasSocialLinks(artist: PlaybookContext['artists'][0] | null) {
  if (!artist?.social_links) return false
  return Object.values(artist.social_links).some(link => !!(link as { url?: string })?.url)
}

function epk(artist: PlaybookContext['artists'][0] | null) {
  return artist?.page_settings?.epk || {}
}

export const PLAYBOOK_CHECKS: Record<string, PlaybookCheckFn> = {
  has_artist: ctx => ctx.artists.length > 0,
  has_artist_image: ctx => {
    const a = primaryArtist(ctx)
    return !!(a?.avatar_url || a?.spotify_image_url)
  },
  has_artist_bio: ctx => {
    const a = primaryArtist(ctx)
    return !!(a?.description && a.description.trim().length > 20)
  },
  has_artist_genre: ctx => {
    const a = primaryArtist(ctx)
    return !!(a?.genre && a.genre.trim())
  },
  has_social_links: ctx => hasSocialLinks(primaryArtist(ctx)),
  has_public_artist_page: ctx => {
    const a = primaryArtist(ctx)
    return !!(a?.page_enabled && a?.page_slug)
  },
  has_public_song_page: ctx => {
    const a = primaryArtist(ctx)
    if (!a?.page_enabled) return false
    return artistSongs(ctx, a.id).some(s => !s.public_hidden)
  },
  has_epk_published: ctx => {
    const a = primaryArtist(ctx)
    const e = epk(a)
    return !!(e.public_enabled && (e.short_bio || e.long_bio))
  },
  has_epk_content: ctx => {
    const a = primaryArtist(ctx)
    const e = epk(a)
    return !!(e.short_bio || e.long_bio || (e.selected_song_ids?.length || 0) > 0)
  },
  has_first_song: ctx => ctx.songs.length > 0,
  has_album: ctx => ctx.albumCount > 0,
  has_song_metadata: ctx => {
    const a = primaryArtist(ctx)
    const songs = artistSongs(ctx, a?.id)
    return songs.some(s =>
      !!(s.cover_image_url || s.spotify_cover_url) &&
      !!(s.lyrics_text || s.lyrics_instructions) &&
      !!(s.spotify_url || (s.media_links?.length || 0) > 0)
    )
  },
  has_release_date: ctx => {
    return ctx.songs.some(s => !!(s.spotify_release_date || (s.publish_content as any)?.campaign_release_date))
  },
  has_campaign: ctx => {
    return ctx.songs.some(s => {
      const pc = s.publish_content || {}
      const timeline = Array.isArray((pc as any).campaign_timeline) ? (pc as any).campaign_timeline : []
      return timeline.length > 0 || !!(pc as any).distribution
    })
  },
  has_spotify_pitch: ctx => ctx.songs.some(s => !!(s.publish_content as any)?.campaign_spotify_pitch),
  has_tiktok_caption: ctx => ctx.songs.some(s => !!(s.publish_content as any)?.campaign_tiktok_caption),
  has_newsletter_draft: ctx => {
    const a = primaryArtist(ctx)
    return !!(a?.page_settings as any)?.fan_hub?.newsletter_draft
  },
  has_subscriber: ctx => ctx.subscriberCount > 0,
  has_qr_click: ctx => ctx.qrClickCount > 0,
  has_embed_view: ctx => ctx.embedViewCount > 0,
  has_fan_interaction: ctx => ctx.subscriberCount > 0 || ctx.linkClickCount > 0,
  has_released_song: ctx => ctx.songs.some(s => s.status === 'released'),
  has_100_clicks: ctx => ctx.linkClickCount >= 100,
}

export function runPlaybookCheck(checkId: string, ctx: PlaybookContext): boolean {
  const fn = PLAYBOOK_CHECKS[checkId]
  return fn ? fn(ctx) : false
}

export function getPrimaryArtist(ctx: PlaybookContext) {
  return primaryArtist(ctx)
}

export function isEssentialSetupComplete(ctx: PlaybookContext): boolean {
  return (
    PLAYBOOK_CHECKS.has_artist(ctx) &&
    PLAYBOOK_CHECKS.has_first_song(ctx) &&
    PLAYBOOK_CHECKS.has_public_artist_page(ctx)
  )
}
