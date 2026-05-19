import Link from 'next/link'

/**
 * Minimal studio template — ultra-clean roster list with mini-players.
 * Distraction-free. Designed for serious labels who want focus on the music itself.
 */
export default function StudioPageMinimal({
  studioPage,
  artists,
  featuredSongs,
}: {
  studioPage: any
  artists: any[]
  featuredSongs: any[]
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Georgia, serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
        {/* Centered text-only header */}
        <header style={{ textAlign: 'center', marginBottom: 70 }}>
          <h1 style={{
            fontSize: 'clamp(36px, 7vw, 56px)',
            fontWeight: 200,
            letterSpacing: '-0.02em',
            margin: 0,
            color: '#fff',
            lineHeight: 1.15,
          }}>
            {studioPage.name || 'Studio'}
          </h1>
          {studioPage.bio && (
            <p style={{
              marginTop: 22,
              fontSize: 15,
              color: '#a09080',
              maxWidth: 520,
              margin: '22px auto 0',
              lineHeight: 1.65,
              fontStyle: 'italic',
            }}>
              {studioPage.bio}
            </p>
          )}
        </header>

        {/* Artist list — clean rows */}
        {artists.length > 0 && (
          <section style={{ marginBottom: 50 }}>
            <h2 style={sectionH2}>Artists</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {artists.map((a: any) => (
                <li key={a.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: '18px 0',
                  borderBottom: '1px solid rgba(180,140,80,0.1)',
                }}>
                  {(a.avatar_url || a.spotify_image_url) ? (
                    <img
                      src={a.avatar_url || a.spotify_image_url}
                      alt={a.name}
                      style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎤</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {a.page_enabled && a.page_slug ? (
                      <Link href={`/p/${a.page_slug}`} style={{ color: '#e8e0d0', fontSize: 18, fontWeight: 300, textDecoration: 'none' }}>
                        {a.name}
                      </Link>
                    ) : (
                      <span style={{ color: '#e8e0d0', fontSize: 18, fontWeight: 300 }}>{a.name}</span>
                    )}
                    {a.genre && <div style={{ color: '#6a5a40', fontSize: 12, marginTop: 2, letterSpacing: 1 }}>{a.genre.toUpperCase()}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {studioPage.contact_email && (
          <section style={{ textAlign: 'center', marginBottom: 50 }}>
            <h2 style={sectionH2}>Contact</h2>
            <a href={`mailto:${studioPage.contact_email}`} style={{ color: '#e8e0d0', fontSize: 16, textDecoration: 'none', letterSpacing: 1 }}>
              {studioPage.contact_email}
            </a>
          </section>
        )}

        <footer style={{
          textAlign: 'center', paddingTop: 40, borderTop: '1px solid rgba(180,140,80,0.08)',
          color: '#5a4a30', fontSize: 11, letterSpacing: 3,
        }}>
          <Link href="/" style={{ color: '#5a4a30', textDecoration: 'none' }}>VIATONE</Link>
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
