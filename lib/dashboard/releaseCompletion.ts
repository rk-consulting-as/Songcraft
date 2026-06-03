import type { DashboardSongRow } from './types'

/** Release completion % for dashboard (lyrics, cover, canvas, captions, distribution, campaign, publish). */
export function calculateReleaseCompletion(song: DashboardSongRow): number {
  const pc = (song.publish_content || {}) as Record<string, unknown>
  const artist = song.artists || {}
  const campaignKeys = ['spotify_pitch', 'tiktok_caption', 'instagram_caption', 'youtube_shorts_caption', 'facebook_post', 'press_bio', 'newsletter_announcement']
  const campaignDone = campaignKeys.filter(k => !!(pc[`campaign_${k}`] as string)).length >= 3
  const captions = pc.captions as Record<string, unknown> | undefined
  const hasCaptions = captions && Object.keys(captions).length > 0
  const distribution = (pc.distribution || {}) as { status?: string; release_date?: string }
  const timeline = Array.isArray(pc.campaign_timeline) ? pc.campaign_timeline : []

  const checks = [
    { w: 15, done: !!song.lyrics_text },
    { w: 15, done: !!(song.cover_image_url || song.spotify_cover_url) },
    { w: 12, done: !!(song.canvas_prompt || song.canvas_video_url) },
    { w: 14, done: campaignDone || hasCaptions },
    { w: 14, done: distribution.status === 'submitted' || distribution.status === 'live' || !!distribution.release_date },
    { w: 14, done: timeline.length > 0 },
    { w: 16, done: !!artist.page_enabled && !!artist.page_slug },
  ]
  const total = checks.reduce((s, c) => s + c.w, 0)
  const done = checks.reduce((s, c) => s + (c.done ? c.w : 0), 0)
  return Math.round((done / total) * 100)
}
