import Link from 'next/link'
import ClientEmbedPlayer from '@/components/ClientEmbedPlayer'

/**
 * Minimal artist template — typography-first. Centered text hero (no big avatar),
 * vertical track list, clean lines, generous whitespace. Designed for understated
 * vibe: singer-songwriters, ambient, classical, indie folk.
 */
export default function ArtistPageMinimal({
  artist,
  songs,
  albums,
}: {
  artist: any
  songs: any[]
  albums: any[]
}) {
  const accent = artist.page_settings?.accent_color || '#d4a843'
  const releasedSongs = songs.filter(s => s.status === 'released')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Georgia, serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
        {/* Centered hero — name only */}
        <header style={{ textAlign: 'center', marginBottom: 80 }}>
          <h1 style={{
            fontSize: 'clamp(40px, 8vw, 72px)',
            fontWeight: 200,
            letterSpacing: '-0.02em',
            margin: 0,
            color: '#fff',
            lineHeight: 1.1,
          }}>
            {artist.name}
          </h1>
          {artist.description && (
            <p style={{
              marginTop: 24,
              fontSize: 16,
              color: '#a09080',
              maxWidth: 520,
              margin: '24px auto 0',
              lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              {artist.description}
            </p>
          )}
          {artist.genre && (
            <p style={{
              marginTop: 18,
              fontSize: 11,
              color: '#6a5a40',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}>
              {artist.genre}
            </p>
          )}
        </header>

        {/* Albums — simple list */}
        {albums.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <h2 style={sectionH2}>Albums</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {albums.map((al: any) => (
                <li key={al.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(180,140,80,0.1)',
                }}>
                  {al.cover_url && (
                    <img src={al.cover_url} alt="" style={{ width: 48, height: 48, borderRadius: 2, objectFit: 'cover' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e8e0d0', fontSize: 15 }}>{al.title}</div>
                    {al.release_date && <div style={{ color: '#5a4a30', fontSize: 12 }}>{al.release_date.slice(0, 4)}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Tracks — vertical with embed players */}
        {releasedSongs.length > 0 && (
          <section style={{ marginBottom: 64 }}>
            <h2 style={sectionH2}>Tracks</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {releasedSongs.map((song: any, i: number) => (
                <div key={song.id} style={{ paddingBottom: 24, borderBottom: i < releasedSongs.length - 1 ? '1px solid rgba(180,140,80,0.08)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
                    <span style={{ color: '#5a4a30', fontSize: 13, fontFamily: 'ui-monospace, monospace', minWidth: 30 }}>{String(i + 1).padStart(2, '0')}</span>
                    <Link href={`/s/${song.id}`} style={{
                      color: '#e8e0d0',
                      fontSize: 18,
                      fontWeight: 300,
                      textDecoration: 'none',
                      flex: 1,
                    }}>{song.title}</Link>
                    {song.internal_play_count > 0 && (
                      <span style={{ color: '#5a4a30', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>{song.internal_play_count}</span>
                    )}
                  </div>
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
                    compact
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Social as text links */}
        {artist.social_links && Object.keys(artist.social_links).length > 0 && (
          <section style={{ marginBottom: 64, textAlign: 'center' }}>
            <h2 style={sectionH2}>Find me on</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
              {Object.entries(artist.social_links).map(([platform, link]: [string, any]) => link?.url && (
                <a
                  key={platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: accent, textDecoration: 'none', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}
                >
                  {platform}
                </a>
              ))}
            </div>
          </section>
        )}

        <footer style={{
          textAlign: 'center',
          paddingTop: 40,
          borderTop: '1px solid rgba(180,140,80,0.08)',
          color: '#5a4a30',
          fontSize: 11,
          letterSpacing: 2,
        }}>
          <Link href="/" style={{ color: '#5a4a30', textDecoration: 'none' }}>SONGCRAFT</Link>
        </footer>
      </div>
    </div>
  )
}

const sectionH2: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: '#8a7a60',
  fontWeight: 400,
  marginBottom: 24,
  textAlign: 'center',
}
