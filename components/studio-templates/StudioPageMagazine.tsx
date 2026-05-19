import Link from 'next/link'

/**
 * Magazine studio template — editorial style. Large featured artist on top,
 * secondary artists in columns, pull-quote typography. Bandcamp/Pitchfork vibe.
 */
export default function StudioPageMagazine({
  studioPage,
  artists,
  featuredSongs,
}: {
  studioPage: any
  artists: any[]
  featuredSongs: any[]
}) {
  const featured = artists[0]
  const rest = artists.slice(1)
  const accent = '#d4a843'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e8e0d0',
      fontFamily: 'Georgia, "Times New Roman", serif',
    }}>
      {/* Masthead */}
      <header style={{
        borderBottom: '2px solid rgba(212,168,67,0.4)',
        padding: '40px 24px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ color: accent, fontSize: 10, letterSpacing: 6, textTransform: 'uppercase', margin: 0, fontFamily: 'system-ui' }}>
            VOLUME I · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
          </p>
          <h1 style={{
            fontSize: 'clamp(40px, 8vw, 80px)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            margin: '12px 0 8px',
            color: '#fff',
            lineHeight: 1,
          }}>
            {studioPage.name || 'Studio'}
          </h1>
          {studioPage.bio && (
            <p style={{
              color: '#a09080',
              fontSize: 14,
              fontStyle: 'italic',
              maxWidth: 600,
              margin: '0 auto',
              lineHeight: 1.6,
            }}>
              {studioPage.bio}
            </p>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
        {/* Featured artist — large editorial spread */}
        {featured && (
          <article style={{
            marginBottom: 80,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 40,
            alignItems: 'center',
          }}>
            {(featured.avatar_url || featured.spotify_image_url) && (
              <img
                src={featured.avatar_url || featured.spotify_image_url}
                alt={featured.name}
                style={{
                  width: '100%',
                  aspectRatio: '4/5',
                  objectFit: 'cover',
                  borderRadius: 2,
                  boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                }}
              />
            )}
            <div>
              <p style={{ color: accent, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: 0, fontFamily: 'system-ui' }}>
                Featured Artist
              </p>
              <h2 style={{
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 900,
                letterSpacing: '-0.01em',
                lineHeight: 1.05,
                margin: '12px 0 16px',
                color: '#fff',
              }}>
                {featured.name}
              </h2>
              {featured.genre && (
                <p style={{ color: '#8a7a60', fontSize: 13, fontStyle: 'italic', margin: '0 0 16px' }}>
                  {featured.genre}
                </p>
              )}
              {featured.page_enabled && featured.page_slug && (
                <Link href={`/p/${featured.page_slug}`} style={{
                  display: 'inline-block',
                  color: accent,
                  textDecoration: 'none',
                  fontSize: 13,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  paddingBottom: 4,
                  borderBottom: `1px solid ${accent}`,
                  fontFamily: 'system-ui',
                }}>
                  Read full profile →
                </Link>
              )}
            </div>
          </article>
        )}

        {/* Pull quote */}
        {studioPage.bio && (
          <blockquote style={{
            margin: '60px auto 80px',
            maxWidth: 760,
            textAlign: 'center',
            padding: '30px 40px',
            borderTop: `2px solid ${accent}`,
            borderBottom: `2px solid ${accent}`,
          }}>
            <p style={{
              fontSize: 'clamp(22px, 3vw, 32px)',
              fontStyle: 'italic',
              lineHeight: 1.4,
              color: '#e8e0d0',
              margin: 0,
              fontWeight: 300,
            }}>
              &ldquo;{studioPage.bio.slice(0, 200)}{studioPage.bio.length > 200 ? '…' : ''}&rdquo;
            </p>
          </blockquote>
        )}

        {/* Secondary artists — column grid */}
        {rest.length > 0 && (
          <section>
            <h2 style={{
              fontSize: 16,
              letterSpacing: 4,
              textTransform: 'uppercase',
              fontFamily: 'system-ui',
              color: accent,
              marginBottom: 30,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(180,140,80,0.2)',
              fontWeight: 700,
            }}>
              Roster
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
              {rest.map((a: any) => (
                <article key={a.id}>
                  {(a.avatar_url || a.spotify_image_url) ? (
                    <img
                      src={a.avatar_url || a.spotify_image_url}
                      alt={a.name}
                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 2 }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '1/1', background: 'rgba(212,168,67,0.15)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎤</div>
                  )}
                  <h3 style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#fff',
                    margin: '14px 0 4px',
                    lineHeight: 1.1,
                  }}>
                    {a.page_enabled && a.page_slug ? (
                      <Link href={`/p/${a.page_slug}`} style={{ color: '#fff', textDecoration: 'none' }}>{a.name}</Link>
                    ) : a.name}
                  </h3>
                  {a.genre && (
                    <p style={{ color: '#8a7a60', fontSize: 12, fontStyle: 'italic', margin: 0 }}>
                      {a.genre}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {studioPage.contact_email && (
          <section style={{ marginTop: 80, textAlign: 'center', paddingTop: 30, borderTop: '1px solid rgba(180,140,80,0.15)' }}>
            <p style={{ color: '#8a7a60', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'system-ui', margin: 0 }}>Inquiries</p>
            <a href={`mailto:${studioPage.contact_email}`} style={{
              display: 'inline-block', marginTop: 10, color: accent, fontSize: 18, textDecoration: 'none',
            }}>{studioPage.contact_email}</a>
          </section>
        )}
      </div>

      <footer style={{
        textAlign: 'center',
        padding: '30px',
        borderTop: '2px solid rgba(212,168,67,0.2)',
        color: '#5a4a30',
        fontSize: 10,
        letterSpacing: 4,
        fontFamily: 'system-ui',
      }}>
        <Link href="/" style={{ color: '#8a7a60', textDecoration: 'none' }}>PUBLISHED BY VIATONE</Link>
      </footer>
    </div>
  )
}
