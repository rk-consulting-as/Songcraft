import Link from 'next/link'
import ClientEmbedPlayer from '@/components/ClientEmbedPlayer'
import NewsletterSignup from '@/components/NewsletterSignup'
import PublicEventsList from '@/components/PublicEventsList'
import PublicAnalyticsTracker from '@/components/PublicAnalyticsTracker'
import ExpandableText from '@/components/ExpandableText'

/**
 * Cinematic artist template — full-bleed dramatic. Avatar fills viewport as blurred
 * background, large bold name overlay, sticky sub-nav, glass-morphism content cards.
 * Designed for established artists who want a strong visual statement.
 */
export default function ArtistPageCinematic({
  artist,
  songs,
  albums,
  events,
}: {
  artist: any
  songs: any[]
  albums: any[]
  events: any[]
}) {
  const accent = artist.page_settings?.accent_color || '#d4a843'
  const releasedSongs = songs.filter(s => s.status === 'released')
  const heroImage = artist.spotify_image_url || artist.avatar_url
  const sections = { newsletter: true, events: true, ...(artist.page_settings?.sections || {}) }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <PublicAnalyticsTracker artistId={artist.id} eventType="artist_page_view" />
      {/* Full-bleed hero with blurred image background */}
      <section style={{
        position: 'relative',
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '40px 24px 60px',
        overflow: 'hidden',
      }}>
        {/* Background: blurred image */}
        {heroImage && (
          <>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              background: `url('${heroImage}') center/cover no-repeat`,
              filter: 'blur(40px) brightness(0.5) saturate(1.1)',
              transform: 'scale(1.12)',
            }} />
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: `linear-gradient(180deg, rgba(10,10,15,0) 0%, rgba(10,10,15,0.4) 50%, rgba(10,10,15,0.95) 100%)`,
            }} />
          </>
        )}
        {!heroImage && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            background: `linear-gradient(135deg, ${accent}22 0%, #12071e 50%, #0a0f0a 100%)`,
          }} />
        )}

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32, flexWrap: 'wrap' }}>
            {heroImage && (
              <img
                src={heroImage}
                alt={artist.name}
                style={{
                  width: 240, height: 240,
                  borderRadius: 12,
                  objectFit: 'cover',
                  boxShadow: '0 20px 80px rgba(0,0,0,0.8)',
                  border: `2px solid ${accent}55`,
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <p style={{ color: accent, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', margin: 0 }}>
                {artist.genre || 'Artist'}
              </p>
              <h1 style={{
                fontSize: 'clamp(48px, 9vw, 96px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                margin: '10px 0',
                color: '#fff',
                lineHeight: 0.95,
                textShadow: '0 8px 40px rgba(0,0,0,0.6)',
              }}>
                {artist.name}
              </h1>
              {artist.description && (
                <ExpandableText
                  text={artist.description}
                  accent={accent}
                  fadeToColor="rgba(10, 10, 15, 0.98)"
                  maxWidth={600}
                  style={{ margin: '14px 0 0' }}
                  paragraphStyle={{
                    margin: 0,
                    fontSize: 16,
                    color: '#c8c0b0',
                    lineHeight: 1.5,
                    textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                  }}
                />
              )}
              {artist.social_links && (
                <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
                  {Object.entries(artist.social_links).map(([platform, link]: [string, any]) => link?.url && (
                    <a
                      key={platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 20,
                        color: '#fff',
                        textDecoration: 'none',
                        fontSize: 12,
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content sections — glass-morphism cards */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        {sections.newsletter !== false && (
          <section style={{ marginBottom: 40 }}>
            <NewsletterSignup artistId={artist.id} sourcePage={`/p/${artist.page_slug}`} accent={accent} />
          </section>
        )}

        {sections.events !== false && (
          <PublicEventsList events={events} accent={accent} />
        )}

        {/* Tracks */}
        {releasedSongs.length > 0 && (
          <section style={{ marginBottom: 60 }}>
            <h2 style={sectionH2}>Featured tracks</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {releasedSongs.map((song: any) => {
                const thumb = song.cover_image_url || song.spotify_cover_url
                return (
                  <div key={song.id} style={glassCard}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width: 56, height: 56, borderRadius: 6, objectFit: 'cover', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 6, background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎵</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link href={`/s/${song.id}`} style={{
                          color: '#fff', fontSize: 16, fontWeight: 600, textDecoration: 'none', display: 'block',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{song.title}</Link>
                        {song.spotify_album && (
                          <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2 }}>{song.spotify_album}</div>
                        )}
                      </div>
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
                )
              })}
            </div>
          </section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <section style={{ marginBottom: 60 }}>
            <h2 style={sectionH2}>Albums</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {albums.map((al: any) => (
                <div key={al.id} style={{ ...glassCard, padding: 12 }}>
                  {al.cover_url ? (
                    <img src={al.cover_url} alt={al.title} style={{ width: '100%', aspectRatio: '1/1', borderRadius: 6, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 6, background: `${accent}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>💿</div>
                  )}
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginTop: 10 }}>{al.title}</div>
                  {al.release_date && <div style={{ color: '#8a7a60', fontSize: 11 }}>{al.release_date.slice(0, 4)}</div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer style={{
        textAlign: 'center',
        padding: '24px',
        borderTop: '1px solid rgba(180,140,80,0.08)',
        color: '#5a4a30',
        fontSize: 12,
        letterSpacing: 1,
      }}>
        <Link href="/" style={{ color: accent, textDecoration: 'none', letterSpacing: 3 }}>VIATONE</Link>
      </footer>
    </div>
  )
}

const sectionH2: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#fff',
  margin: '40px 0 20px',
  letterSpacing: '-0.01em',
}

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: 16,
  backdropFilter: 'blur(20px)',
}
