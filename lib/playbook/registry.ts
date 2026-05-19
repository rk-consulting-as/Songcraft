import type { PlaybookContext, PlaybookMilestoneDef, PlaybookTaskDef } from './types'

function artistHref(ctx: PlaybookContext, hash = '') {
  const id = ctx.selectedArtistId || ctx.artists[0]?.id
  return id ? `/artist/${id}${hash}` : '/dashboard'
}

function songHref(ctx: PlaybookContext, hash = '') {
  const song = ctx.songs.find(s => s.artist_id === (ctx.selectedArtistId || ctx.artists[0]?.id)) || ctx.songs[0]
  return song ? `/song/${song.id}${hash}` : artistHref(ctx, '#songs')
}

export const PLAYBOOK_CATEGORY_ORDER = ['profile', 'public', 'music', 'promotion', 'growth'] as const

export const PLAYBOOK_TASKS: PlaybookTaskDef[] = [
  // PROFILE
  { id: 'profile_image', category: 'profile', checkId: 'has_artist_image', weight: 2, priority: 20, labelKey: 'playbookTaskProfileImage', href: ctx => artistHref(ctx, '#settings') },
  { id: 'profile_bio', category: 'profile', checkId: 'has_artist_bio', weight: 2, priority: 21, labelKey: 'playbookTaskProfileBio', href: ctx => artistHref(ctx, '#settings') },
  { id: 'profile_genre', category: 'profile', checkId: 'has_artist_genre', weight: 1, priority: 22, labelKey: 'playbookTaskProfileGenre', href: ctx => artistHref(ctx, '#settings') },
  { id: 'profile_social', category: 'profile', checkId: 'has_social_links', weight: 2, priority: 23, labelKey: 'playbookTaskProfileSocial', descKey: 'playbookTaskProfileSocialDesc', href: ctx => artistHref(ctx, '#settings') },

  // PUBLIC
  { id: 'public_artist_page', category: 'public', checkId: 'has_public_artist_page', weight: 3, priority: 10, labelKey: 'playbookTaskPublicArtist', href: ctx => artistHref(ctx, '#public') },
  { id: 'public_song_page', category: 'public', checkId: 'has_public_song_page', weight: 2, priority: 11, labelKey: 'playbookTaskPublicSong', href: ctx => songHref(ctx) },
  { id: 'public_epk', category: 'public', checkId: 'has_epk_published', weight: 2, priority: 12, labelKey: 'playbookTaskPublicEpk', href: ctx => artistHref(ctx, '#epk') },
  { id: 'public_qr', category: 'public', checkId: 'has_public_artist_page', weight: 1, priority: 13, labelKey: 'playbookTaskPublicQr', href: ctx => artistHref(ctx, '#public') },

  // MUSIC
  { id: 'music_first_song', category: 'music', checkId: 'has_first_song', weight: 3, priority: 1, labelKey: 'playbookTaskMusicFirstSong', tags: ['release'], href: ctx => artistHref(ctx, '#songs') },
  { id: 'music_album', category: 'music', checkId: 'has_album', weight: 2, priority: 30, labelKey: 'playbookTaskMusicAlbum', href: ctx => artistHref(ctx, '#songs') },
  { id: 'music_metadata', category: 'music', checkId: 'has_song_metadata', weight: 2, priority: 14, labelKey: 'playbookTaskMusicMetadata', tags: ['release'], href: ctx => songHref(ctx) },
  { id: 'music_release_date', category: 'music', checkId: 'has_release_date', weight: 2, priority: 15, labelKey: 'playbookTaskMusicReleaseDate', tags: ['release'], href: ctx => songHref(ctx, '#campaign') },

  // PROMOTION
  { id: 'promo_campaign', category: 'promotion', checkId: 'has_campaign', weight: 3, priority: 16, labelKey: 'playbookTaskPromoCampaign', tags: ['release'], href: ctx => songHref(ctx, '#campaign') },
  { id: 'promo_spotify_pitch', category: 'promotion', checkId: 'has_spotify_pitch', weight: 2, priority: 17, labelKey: 'playbookTaskPromoSpotifyPitch', tags: ['release'], href: ctx => songHref(ctx, '#campaign') },
  { id: 'promo_tiktok', category: 'promotion', checkId: 'has_tiktok_caption', weight: 2, priority: 18, labelKey: 'playbookTaskPromoTiktok', href: ctx => songHref(ctx, '#captions') },
  { id: 'promo_newsletter', category: 'promotion', checkId: 'has_newsletter_draft', weight: 2, priority: 19, labelKey: 'playbookTaskPromoNewsletter', tags: ['growth'], href: ctx => artistHref(ctx, '#fanhub') },

  // GROWTH
  { id: 'growth_subscriber', category: 'growth', checkId: 'has_subscriber', weight: 3, priority: 24, labelKey: 'playbookTaskGrowthSubscriber', tags: ['growth'], href: ctx => artistHref(ctx, '#fanhub') },
  { id: 'growth_qr', category: 'growth', checkId: 'has_qr_click', weight: 2, priority: 25, labelKey: 'playbookTaskGrowthQr', tags: ['growth'], href: ctx => artistHref(ctx, '#public') },
  { id: 'growth_embed', category: 'growth', checkId: 'has_embed_view', weight: 2, priority: 26, labelKey: 'playbookTaskGrowthEmbed', tags: ['growth'], href: ctx => songHref(ctx, '#publish') },
  { id: 'growth_interaction', category: 'growth', checkId: 'has_fan_interaction', weight: 2, priority: 27, labelKey: 'playbookTaskGrowthInteraction', tags: ['growth'], href: ctx => artistHref(ctx, '#analytics') },
]

export const PLAYBOOK_MILESTONES: PlaybookMilestoneDef[] = [
  { id: 'milestone_first_release', checkId: 'has_released_song', labelKey: 'playbookMilestoneFirstRelease', icon: '🎵' },
  { id: 'milestone_first_public', checkId: 'has_public_artist_page', labelKey: 'playbookMilestoneFirstPublic', icon: '🌐' },
  { id: 'milestone_first_subscriber', checkId: 'has_subscriber', labelKey: 'playbookMilestoneFirstSubscriber', icon: '✉' },
  { id: 'milestone_first_campaign', checkId: 'has_campaign', labelKey: 'playbookMilestoneFirstCampaign', icon: '📣' },
  { id: 'milestone_first_embed', checkId: 'has_embed_view', labelKey: 'playbookMilestoneFirstEmbed', icon: '⧉' },
  { id: 'milestone_100_clicks', checkId: 'has_100_clicks', labelKey: 'playbookMilestone100Clicks', icon: '📊' },
]
