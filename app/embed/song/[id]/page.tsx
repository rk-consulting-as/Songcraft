import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import MediaLinksGrid from '@/components/MediaLinksGrid'
import PublicAnalyticsTracker from '@/components/PublicAnalyticsTracker'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

async function fetchSong(songId: string) {
  const { data: song, error } = await sb
    .from('songs')
    .select('id, title, backstory, spotify_url, suno_url, media_links, cover_image_url, spotify_cover_url, artist_id, user_id, artists(id, name, page_enabled, page_slug)')
    .eq('id', songId)
    .maybeSingle()
  if (error || !song) return null
  const artist = (song as any).artists
  if (!artist?.page_enabled) return null
  return song as any
}

async function canRemoveBranding(userId: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return false
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
  const { data } = await service
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.plan_id === 'pro' && ['active', 'trialing', 'past_due'].includes(data?.status)
}

export default async function EmbedSongPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { theme?: string; branding?: string }
}) {
  const song = await fetchSong(params.id)
  if (!song) notFound()

  const artist = song.artists
  const cover = song.cover_image_url || song.spotify_cover_url
  const theme = searchParams?.theme === 'light' ? 'light' : 'dark'
  const accent = '#d4a843'
  const allowNoBranding = await canRemoveBranding(song.user_id)
  const showBranding = searchParams?.branding === '0' ? !allowNoBranding : true
  const bg = theme === 'light' ? '#fbf7ef' : '#0a0a0f'
  const fg = theme === 'light' ? '#18130c' : '#e8e0d0'
  const muted = theme === 'light' ? '#75654a' : '#8a7a60'
  const card = theme === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.035)'

  const links = [
    ...(song.spotify_url ? [{ platform: 'Spotify', url: song.spotify_url, label: 'Spotify' }] : []),
    ...(song.suno_url ? [{ platform: 'Suno', url: song.suno_url, label: 'Suno' }] : []),
    ...(Array.isArray(song.media_links) ? song.media_links : []),
  ]

  return (
    <div style={{ margin: 0, background: bg, color: fg, fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', minHeight: '100vh' }}>
      <PublicAnalyticsTracker artistId={artist.id} songId={song.id} eventType="embed_view" />
      <main style={{ boxSizing: 'border-box', width: '100%', minHeight: '100vh', padding: 14 }}>
          <div style={{ background: card, border: `1px solid ${accent}30`, borderRadius: 14, padding: 14, boxShadow: theme === 'light' ? '0 10px 30px rgba(0,0,0,0.08)' : '0 10px 34px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
              {cover ? (
                <img src={cover} alt="" style={{ width: 92, height: 92, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 92, height: 92, borderRadius: 10, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>♪</div>
              )}
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, color: fg, fontSize: 20, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</h1>
                <p style={{ margin: '5px 0 0', color: muted, fontSize: 13 }}>{artist.name}</p>
              </div>
            </div>

            {song.backstory && (
              <p style={{ color: muted, fontSize: 13, lineHeight: 1.55, margin: '0 0 14px' }}>
                {song.backstory.length > 260 ? song.backstory.slice(0, 260).trimEnd() + '...' : song.backstory}
              </p>
            )}

            {links.length > 0 && (
              <div>
                <div style={{ color: accent, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Listen on</div>
                <MediaLinksGrid links={links} songId={song.id} artistId={artist.id} sourcePage={`/embed/song/${song.id}`} accent={accent} />
              </div>
            )}

            {showBranding && (
              <a href="https://songcraft.local" target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: muted, textDecoration: 'none', fontSize: 11, marginTop: 12, textAlign: 'right' }}>
                Powered by <span style={{ color: accent }}>Songcraft</span>
              </a>
            )}
          </div>
      </main>
    </div>
  )
}
