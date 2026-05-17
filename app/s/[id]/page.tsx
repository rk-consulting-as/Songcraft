import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ClientEmbedPlayer from '@/components/ClientEmbedPlayer'
import ReactionBar from '@/components/ReactionBar'
import CommentsThread from '@/components/CommentsThread'
import MediaLinksGrid from '@/components/MediaLinksGrid'
import BackstoryDisplay from '@/components/BackstoryDisplay'
import ShareButtons from '@/components/ShareButtons'
import NewsletterSignup from '@/components/NewsletterSignup'
import PublicAnalyticsTracker from '@/components/PublicAnalyticsTracker'

// Public song detail page. Server-rendered with anon client; RLS gates by artist.page_enabled.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

async function fetchSong(songId: string) {
  try {
    const { data: song, error } = await sb
      .from('songs')
      .select('id, title, lyrics_text, suno_audio_url, spotify_url, suno_url, media_links, backstory, cover_image_url, spotify_cover_url, spotify_album, spotify_release_date, internal_play_count, embed_click_count, comment_count, reaction_count, artist_id, user_id, artists(id, name, page_enabled, page_slug, avatar_url, spotify_image_url)')
      .eq('id', songId)
      .maybeSingle()
    if (error || !song) return null
    const a = (song as any).artists
    if (!a?.page_enabled) return null  // Not public
    return song as any
  } catch (e: any) {
    console.error('[s/id] fetchSong crashed:', e?.message)
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const song = await fetchSong(params.id)
    if (!song) return { title: 'Songcraft — Song not found' }
    const cover = song.cover_image_url || song.spotify_cover_url
    return {
      title: `${song.title} · ${song.artists?.name || 'Songcraft'}`,
      description: `Listen to ${song.title} by ${song.artists?.name || 'this artist'} on Songcraft.`,
      openGraph: { title: song.title, images: cover ? [cover] : [] },
      twitter: { card: cover ? 'summary_large_image' : 'summary', title: song.title, images: cover ? [cover] : [] },
    }
  } catch {
    return { title: 'Songcraft' }
  }
}

export default async function PublicSongPage({ params }: { params: { id: string } }) {
  const song = await fetchSong(params.id)
  if (!song) notFound()

  const artist = song.artists
  const cover = song.cover_image_url || song.spotify_cover_url
  const accent = '#d4a843'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <PublicAnalyticsTracker artistId={artist.id} songId={song.id} eventType="song_page_view" />
      {/* Slim header */}
      <div style={{
        borderBottom: '1px solid rgba(180,140,80,0.2)',
        padding: '14px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        {artist.page_slug ? (
          <Link href={`/p/${artist.page_slug}`} style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>
            ← {artist.name}
          </Link>
        ) : (
          <Link href="/discover" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← Discover</Link>
        )}
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: 14, letterSpacing: 2 }}>SONGCRAFT</Link>
        <Link href="/login" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>Sign in</Link>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Hero */}
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
          {cover ? (
            <img src={cover} alt={song.title} style={{ width: 180, height: 180, borderRadius: 8, objectFit: 'cover', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
          ) : (
            <div style={{ width: 180, height: 180, borderRadius: 8, background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, flexShrink: 0 }}>🎵</div>
          )}
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <h1 style={{ margin: 0, color: '#e8e0d0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' }}>{song.title}</h1>
            <div style={{ color: '#a09080', fontSize: 15, marginTop: 6 }}>
              {artist.page_slug ? (
                <Link href={`/p/${artist.page_slug}`} style={{ color: '#a09080', textDecoration: 'none' }}>🎤 {artist.name}</Link>
              ) : (
                <span>🎤 {artist.name}</span>
              )}
            </div>
            {song.spotify_album && (
              <div style={{ color: '#6a5a40', fontSize: 12, marginTop: 4 }}>
                {song.spotify_album}{song.spotify_release_date ? ' · ' + song.spotify_release_date.slice(0, 4) : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: 14, marginTop: 14, color: '#6a5a40', fontSize: 12, flexWrap: 'wrap' }}>
              {song.internal_play_count > 0 && <span>▶ {song.internal_play_count.toLocaleString()} plays</span>}
              {song.embed_click_count > 0 && <span>🔗 {song.embed_click_count.toLocaleString()} clicks</span>}
              {song.comment_count > 0 && <span>💬 {song.comment_count} comments</span>}
              {song.reaction_count > 0 && <span>👍 {song.reaction_count} reactions</span>}
            </div>
          </div>
        </div>

        {/* Embed player */}
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
        />

        <div style={{ marginTop: 28 }}>
          <NewsletterSignup artistId={artist.id} sourcePage={`/s/${song.id}`} accent={accent} />
        </div>

        {/* Listen / find on … (media links) */}
        {(song.media_links?.length > 0 || song.spotify_url || song.suno_url) && (
          <div style={{ marginTop: 28 }}>
            <h2 style={sectionH2}>Listen / Find on</h2>
            <MediaLinksGrid
              links={[
                ...(song.spotify_url ? [{ platform: 'Spotify', url: song.spotify_url, label: 'Spotify' }] : []),
                ...(song.suno_url ? [{ platform: 'Suno', url: song.suno_url, label: 'Suno' }] : []),
                ...(Array.isArray(song.media_links) ? song.media_links : []),
              ]}
              songId={song.id}
              artistId={artist.id}
              sourcePage={`/s/${song.id}`}
            />
          </div>
        )}

        {/* Backstory */}
        {song.backstory && (
          <div style={{ marginTop: 28 }}>
            <h2 style={sectionH2}>The story behind</h2>
            <BackstoryDisplay text={song.backstory} />
          </div>
        )}

        {/* Share */}
        <div style={{ marginTop: 28 }}>
          <h2 style={sectionH2}>Share</h2>
          <ShareButtons
            url={`/s/${song.id}`}
            title={`${song.title} · ${artist.name}`}
            text={`Listen to "${song.title}" by ${artist.name} on Songcraft`}
          />
        </div>

        {/* Reactions */}
        <div style={{ marginTop: 28 }}>
          <h2 style={sectionH2}>Reactions</h2>
          <ReactionBar songId={song.id} />
        </div>

        {/* Lyrics excerpt (if present) */}
        {song.lyrics_text && (
          <div style={{ marginTop: 24 }}>
            <h2 style={sectionH2}>Lyrics</h2>
            <pre style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(180,140,80,0.15)',
              borderRadius: 8,
              padding: 16,
              color: '#c8c0b0',
              fontSize: 13,
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 320,
              overflowY: 'auto',
            }}>{song.lyrics_text}</pre>
          </div>
        )}

        {/* Comments */}
        <div style={{ marginTop: 28 }}>
          <h2 style={sectionH2}>Comments ({song.comment_count || 0})</h2>
          <CommentsThread songId={song.id} songOwnerId={song.user_id} />
        </div>
      </div>
    </div>
  )
}

const sectionH2: React.CSSProperties = {
  color: '#d4a843',
  fontSize: 13,
  letterSpacing: 1,
  textTransform: 'uppercase',
  fontWeight: 'normal',
  margin: '0 0 12px',
}
