import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/platformGrowth/seo'
import { resolveSongOgImage } from '@/lib/mediaLibrary/resolveImages'
import CreatorAcquisitionCta from '@/components/platform/CreatorAcquisitionCta'
import ViaToneBranding from '@/components/platform/ViaToneBranding'
import ClientEmbedPlayer from '@/components/ClientEmbedPlayer'
import ReactionBar from '@/components/ReactionBar'
import CommentsThread from '@/components/CommentsThread'
import MediaLinksGrid from '@/components/MediaLinksGrid'
import BackstoryDisplay from '@/components/BackstoryDisplay'
import ShareButtons from '@/components/ShareButtons'
import NewsletterSignup from '@/components/NewsletterSignup'
import PublicAnalyticsTracker from '@/components/PublicAnalyticsTracker'
import PublicStickyListen from '@/components/public/PublicStickyListen'

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
      .select('id, title, lyrics_text, suno_audio_url, spotify_url, suno_url, media_links, backstory, cover_image_url, spotify_cover_url, spotify_album, spotify_release_date, internal_play_count, embed_click_count, comment_count, reaction_count, artist_id, user_id, public_hidden, artists(id, name, page_enabled, page_slug, avatar_url, spotify_image_url, admin_hidden, page_settings)')
      .eq('id', songId)
      .maybeSingle()
    if (error || !song) return null
    const a = (song as any).artists
    if (!a?.page_enabled || a?.admin_hidden || (song as any).public_hidden) return null
    return song as any
  } catch (e: any) {
    console.error('[s/id] fetchSong crashed:', e?.message)
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const song = await fetchSong(params.id)
    if (!song) return { title: 'ViaTone — Song not found' }
    const artist = song.artists
    let featuredAsset = null
    if (artist?.id) {
      const { data } = await sb
        .from('media_assets')
        .select('file_url, thumbnail_url, visibility, is_featured')
        .eq('artist_id', artist.id)
        .eq('visibility', 'public')
        .eq('is_featured', true)
        .maybeSingle()
      featuredAsset = data
    }
    const ogImage = resolveSongOgImage({
      songCover: song.cover_image_url || song.spotify_cover_url,
      artist: artist || {},
      featuredMediaAsset: featuredAsset,
    })
    const artistName = artist?.name || 'Artist'
    const desc = song.backstory
      ? String(song.backstory).slice(0, 155).trim() + (song.backstory.length > 155 ? '…' : '')
      : `Listen to ${song.title} by ${artistName} — public release on ViaTone.`
    return buildPublicMetadata({
      title: `${song.title} · ${artistName}`,
      description: desc,
      path: `/s/${params.id}`,
      image: ogImage,
      keywords: [song.title, artistName, 'music release'],
    })
  } catch {
    return { title: 'ViaTone' }
  }
}

export default async function PublicSongPage({ params }: { params: { id: string } }) {
  const song = await fetchSong(params.id)
  if (!song) notFound()

  const artist = song.artists
  const cover = song.cover_image_url || song.spotify_cover_url
  const accent = '#d4a843'
  const hasListen = !!(song.media_links?.length || song.spotify_url || song.suno_url || song.suno_audio_url)

  const mediaLinks = [
    ...(song.spotify_url ? [{ platform: 'Spotify', url: song.spotify_url, label: 'Spotify' }] : []),
    ...(song.suno_url ? [{ platform: 'Suno', url: song.suno_url, label: 'Suno' }] : []),
    ...(Array.isArray(song.media_links) ? song.media_links : []),
  ]

  return (
    <div className="public-surface public-surface--song" style={{ ['--pub-accent' as string]: accent }}>
      <PublicAnalyticsTracker artistId={artist.id} songId={song.id} eventType="song_page_view" />

      <header className="public-header">
        {artist.page_slug ? (
          <Link href={`/p/${artist.page_slug}`} className="public-header__back">← {artist.name}</Link>
        ) : (
          <Link href="/discover" className="public-header__back">← Discover</Link>
        )}
        <Link href="/" className="public-header__brand">VIATONE</Link>
        <Link href="/login" className="public-header__signin">Sign in</Link>
      </header>

      <div className="public-body">
        <section className="public-song-hero">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="public-song-cover" width={200} height={200} loading="eager" />
          ) : (
            <div className="public-song-cover public-song-cover--placeholder" aria-hidden>🎵</div>
          )}
          <div className="public-song-meta" style={{ flex: '1 1 260px', minWidth: 0 }}>
            <h1>{song.title}</h1>
            <p style={{ color: '#a09080', fontSize: 15, margin: '8px 0 0' }}>
              {artist.page_slug ? (
                <Link href={`/p/${artist.page_slug}`} style={{ color: '#a09080', textDecoration: 'none' }}>
                  {artist.name}
                </Link>
              ) : (
                artist.name
              )}
            </p>
            {song.spotify_album && (
              <p style={{ color: '#6a5a40', fontSize: 12, margin: '4px 0 0' }}>
                {song.spotify_album}
                {song.spotify_release_date ? ` · ${song.spotify_release_date.slice(0, 4)}` : ''}
              </p>
            )}
            <div className="public-song-stats">
              {song.internal_play_count > 0 && <span>▶ {song.internal_play_count.toLocaleString()} plays</span>}
              {song.embed_click_count > 0 && <span>🔗 {song.embed_click_count.toLocaleString()} clicks</span>}
              {song.comment_count > 0 && <span>💬 {song.comment_count}</span>}
              {song.reaction_count > 0 && <span>👍 {song.reaction_count}</span>}
            </div>
          </div>
        </section>

        <section id="listen" className="public-section">
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
        </section>

        <section className="public-section">
          <NewsletterSignup artistId={artist.id} sourcePage={`/s/${song.id}`} accent={accent} />
        </section>

        {hasListen && mediaLinks.length > 0 && (
          <section className="public-section">
            <h2 className="public-section__title">Listen / Find on</h2>
            <div className="public-panel">
              <MediaLinksGrid
                links={mediaLinks}
                songId={song.id}
                artistId={artist.id}
                sourcePage={`/s/${song.id}`}
                accent={accent}
              />
            </div>
          </section>
        )}

        {song.backstory && (
          <section className="public-section">
            <h2 className="public-section__title">The story behind</h2>
            <div className="public-panel">
              <BackstoryDisplay text={song.backstory} />
            </div>
          </section>
        )}

        <section className="public-section">
          <h2 className="public-section__title">Share</h2>
          <ShareButtons
            url={`/s/${song.id}`}
            title={`${song.title} · ${artist.name}`}
            text={`Listen to "${song.title}" by ${artist.name} on ViaTone`}
            accent={accent}
          />
        </section>

        <section className="public-section">
          <h2 className="public-section__title">Reactions</h2>
          <ReactionBar songId={song.id} />
        </section>

        {song.lyrics_text && (
          <section className="public-section">
            <h2 className="public-section__title">Lyrics</h2>
            <pre className="public-lyrics">{song.lyrics_text}</pre>
          </section>
        )}

        <section className="public-section">
          <h2 className="public-section__title">Comments ({song.comment_count || 0})</h2>
          <CommentsThread songId={song.id} songOwnerId={song.user_id} />
        </section>

        <CreatorAcquisitionCta variant="card" accent={accent} />

        <footer className="public-footer">
          <ViaToneBranding variant="footer" accent={accent} href="/login" />
        </footer>
      </div>

      <PublicStickyListen label="Listen now" targetId="listen" />
    </div>
  )
}
