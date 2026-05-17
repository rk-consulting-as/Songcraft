import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ClientEmbedPlayer from '@/components/ClientEmbedPlayer'
import ArtistPageMinimal from '@/components/artist-templates/ArtistPageMinimal'
import ArtistPageCinematic from '@/components/artist-templates/ArtistPageCinematic'
import ShareButtons from '@/components/ShareButtons'
import NewsletterSignup from '@/components/NewsletterSignup'
import PublicEventsList from '@/components/PublicEventsList'

// Public artist landing page. Server-rendered, anonymous Supabase client (RLS gates by page_enabled).
// URL: /p/{slug}

// Always render fresh — never cache the 404 or stale data.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

type PageSections = {
  hero?: boolean
  spotify?: boolean
  youtube?: boolean
  albums?: boolean
  songs?: boolean
  bio?: boolean
  social?: boolean
  events?: boolean
  newsletter?: boolean
}

type PageSettings = {
  sections?: PageSections
  accent_color?: string
  youtube_videos?: string[]
}

async function fetchPageData(slug: string) {
  console.log(`[public-page] Fetching slug="${slug}"`)
  const { data: artist, error: artistErr } = await sb.from('artists').select('*').eq('page_slug', slug).eq('page_enabled', true).maybeSingle()
  if (artistErr) {
    console.error('[public-page] artist query error:', artistErr)
  }
  if (!artist) {
    console.warn(`[public-page] No artist found for slug="${slug}" (page_enabled=true)`)
    return null
  }
  console.log(`[public-page] Found artist: ${artist.name} (id=${artist.id})`)
  const { data: songs, error: songsErr } = await sb.from('songs').select('*').eq('artist_id', artist.id)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (songsErr) console.error('[public-page] songs query error:', songsErr)
  const { data: albums, error: albumsErr } = await sb.from('albums').select('*').eq('artist_id', artist.id)
    .order('release_date', { ascending: false, nullsFirst: false })
  if (albumsErr) console.error('[public-page] albums query error:', albumsErr)
  const { data: events, error: eventsErr } = await sb
    .from('artist_events')
    .select('id, title, date, venue, city, country, ticket_url, status')
    .eq('artist_id', artist.id)
    .in('status', ['scheduled', 'sold_out'])
    .order('date', { ascending: true })
  if (eventsErr) console.error('[public-page] events query error:', eventsErr)
  return { artist, songs: songs || [], albums: albums || [], events: events || [] }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await fetchPageData(params.slug)
  if (!data) return { title: 'Not found' }
  const cover = data.artist.spotify_image_url || data.artist.avatar_url
  // Prefer a custom favicon, then Spotify image as fallback (most album-cover-like).
  const favicon = data.artist.favicon_url || data.artist.spotify_image_url || data.artist.avatar_url
  return {
    title: `${data.artist.name} — Songcraft`,
    description: data.artist.description || `${data.artist.name} — official artist page`,
    icons: favicon ? { icon: favicon, shortcut: favicon, apple: favicon } : undefined,
    openGraph: {
      title: data.artist.name,
      description: data.artist.description || undefined,
      images: cover ? [cover] : [],
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: data.artist.name,
      description: data.artist.description || undefined,
      images: cover ? [cover] : [],
    },
  }
}

/** Extract YouTube video ID from common URL forms. */
function youtubeId(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    if (/youtu\.be$/i.test(u.hostname)) return u.pathname.replace(/^\//, '') || null
    if (/youtube\.com$/i.test(u.hostname)) {
      if (u.pathname === '/watch') return u.searchParams.get('v')
      const m = u.pathname.match(/^\/(?:embed|v|shorts)\/([^/?]+)/)
      if (m) return m[1]
    }
  } catch { /* ignore */ }
  return null
}

export default async function ArtistPublicPage({ params }: { params: { slug: string } }) {
  const data = await fetchPageData(params.slug)
  if (!data) notFound()
  const { artist, songs, albums, events } = data

  // Route to the selected template
  const template = (artist as any).page_template || 'default'
  if (template === 'minimal') {
    return <ArtistPageMinimal artist={artist} songs={songs} albums={albums} events={events} />
  }
  if (template === 'cinematic') {
    return <ArtistPageCinematic artist={artist} songs={songs} albums={albums} events={events} />
  }

  // Default template (continues with existing layout below)
  const settings: PageSettings = artist.page_settings || {}
  const s: PageSections = {
    hero: true, spotify: true, youtube: true, albums: true, songs: true, bio: true, social: true, events: true, newsletter: true,
    ...(settings.sections || {}),
  }
  const accent = settings.accent_color || '#d4a843'
  const ytIds = (settings.youtube_videos || []).map(youtubeId).filter(Boolean) as string[]
  const releasedSongs = songs.filter((sg: any) => sg.status === 'released' || sg.suno_url)
  const cover = artist.spotify_image_url || artist.avatar_url

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      {/* Hero */}
      <section style={{
        position: 'relative',
        minHeight: 480,
        background: cover
          ? `linear-gradient(180deg, rgba(10,10,15,0.55) 0%, rgba(10,10,15,0.85) 70%, #0a0a0f 100%), url(${cover}) center/cover no-repeat`
          : `linear-gradient(135deg, ${accent}22 0%, #0a0a0f 100%)`,
        padding: '60px 24px 48px',
        textAlign: 'center',
        borderBottom: `1px solid ${accent}33`,
      }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={artist.name} style={{ width: 180, height: 180, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}`, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }} />
          )}
          <h1 style={{ margin: 0, fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
            {artist.name}
          </h1>
          {artist.genre && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {artist.genre.split(', ').filter(Boolean).map((g: string) => (
                <span key={g} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, color: accent, border: `1px solid ${accent}55`, background: `${accent}11`, letterSpacing: 0.5 }}>{g}</span>
              ))}
            </div>
          )}
          {s.bio && artist.description && (
            <p style={{ margin: 0, maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: '#c8c0b0' }}>
              {artist.description}
            </p>
          )}

          {/* Social row */}
          {s.social && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
              {artist.spotify_verified && artist.spotify_url && (
                <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: '#1ed760', color: '#000', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                  ♪ Spotify
                </a>
              )}
              {artist.social_links?.youtube?.url && (
                <a href={artist.social_links.youtube.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: '#ff0000', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                  ▶ YouTube
                </a>
              )}
              {artist.social_links?.instagram?.url && (
                <a href={artist.social_links.instagram.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                  ◎ Instagram
                </a>
              )}
              {artist.social_links?.tiktok?.url && (
                <a href={artist.social_links.tiktok.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: '#000', border: '1px solid #fff', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                  TikTok
                </a>
              )}
              {artist.social_links?.website?.url && (
                <a href={artist.social_links.website.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, border: `1px solid ${accent}66`, color: accent, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
                  Website
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Spotify artist embed */}
        {s.newsletter !== false && (
          <section style={{ marginBottom: 48 }}>
            <NewsletterSignup artistId={artist.id} sourcePage={`/p/${artist.page_slug}`} accent={accent} />
          </section>
        )}

        {s.events !== false && (
          <PublicEventsList events={events} accent={accent} />
        )}

        {/* Spotify artist embed */}
        {s.spotify && artist.spotify_id && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Listen on Spotify</h2>
            <iframe
              src={`https://open.spotify.com/embed/artist/${encodeURIComponent(artist.spotify_id)}?utm_source=generator&theme=0`}
              width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" style={{ borderRadius: 12 }}
            />
          </section>
        )}

        {/* Featured YouTube videos */}
        {s.youtube && ytIds.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Videos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {ytIds.map(id => (
                <div key={id} style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${id}`}
                    title="YouTube video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Albums */}
        {s.albums && albums.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Albums</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {albums.map((al: any) => (
                <div key={al.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                  {al.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={al.cover_url} alt={al.title} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 4, marginBottom: 10 }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 4, background: `${accent}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 10 }}>💿</div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{al.title}</div>
                  {al.release_date && <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2 }}>{al.release_date.slice(0, 4)}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Songs / tracks list */}
        {s.songs && releasedSongs.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Tracks</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {releasedSongs.map((song: any, i: number) => {
                const thumb = song.spotify_cover_url || song.cover_image_url
                return (
                  <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', flexWrap: 'wrap' }}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 4, background: `${accent}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#5a4a30' }}>#{i + 1}</div>
                    )}
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
                      {(song.spotify_album || song.spotify_release_date) && (
                        <div style={{ color: '#8a7a60', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {song.spotify_album}{song.spotify_release_date ? ' · ' + song.spotify_release_date.slice(0, 4) : ''}
                        </div>
                      )}
                    </div>
                    {/* Embed player — picks Spotify/YouTube/SoundCloud/Apple/internal automatically */}
                    <div style={{ flex: '1 1 280px', minWidth: 240, maxWidth: 380 }}>
                      <ClientEmbedPlayer
                        song={{
                          id: song.id,
                          title: song.title,
                          cover_image_url: song.cover_image_url,
                          spotify_cover_url: song.spotify_cover_url,
                          suno_audio_url: song.suno_audio_url,
                          spotify_url: song.spotify_url,
                          suno_url: song.suno_url,
                          media_links: song.media_links,
                          artist_name: artist.name,
                        }}
                        showCounter
                        compact
                      />
                    </div>
                    {/* Counters + open link */}
                    <div style={{ color: '#6a5a40', fontSize: 11, display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
                      {song.internal_play_count > 0 && <span>▶ {song.internal_play_count.toLocaleString()}</span>}
                      {song.embed_click_count > 0 && <span>🔗 {song.embed_click_count.toLocaleString()}</span>}
                      {song.comment_count > 0 && <span>💬 {song.comment_count}</span>}
                      {song.reaction_count > 0 && <span>👍 {song.reaction_count}</span>}
                      <Link href={`/s/${song.id}`} style={{ color: accent, textDecoration: 'none', padding: '4px 10px', border: `1px solid ${accent}55`, borderRadius: 12, fontSize: 11 }}>
                        Open →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Share */}
        <section style={{ marginTop: 48, marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Share this artist</h2>
          <ShareButtons
            url={`/p/${artist.page_slug}`}
            title={`${artist.name} — Songcraft`}
            text={`Check out ${artist.name} on Songcraft`}
            accent={accent}
          />
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', color: '#5a4a30', fontSize: 12 }}>
          <Link href="/" style={{ color: '#5a4a30', textDecoration: 'none' }}>
            Powered by <span style={{ color: accent, fontWeight: 600 }}>Songcraft</span>
          </Link>
        </footer>
      </div>
    </div>
  )
}
