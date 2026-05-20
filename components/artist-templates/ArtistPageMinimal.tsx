import Link from 'next/link'
import ClientEmbedPlayer from '@/components/ClientEmbedPlayer'
import NewsletterSignup from '@/components/NewsletterSignup'
import PublicEventsList from '@/components/PublicEventsList'
import PublicAnalyticsTracker from '@/components/PublicAnalyticsTracker'
import ExpandableText from '@/components/ExpandableText'
import PublicCreatorIdentityBlock from '@/components/discover/PublicCreatorIdentityBlock'
import CreatorAcquisitionCta from '@/components/platform/CreatorAcquisitionCta'
import ViaToneBranding from '@/components/platform/ViaToneBranding'
import { resolvePublicArtistImages } from '@/lib/mediaLibrary/resolveImages'
import PublicOwnerAdSlot from '@/components/ads/PublicOwnerAdSlot'

/**
 * Minimal artist template — typography-first. Centered text hero (no big avatar),
 * vertical track list, clean lines, generous whitespace. Designed for understated
 * vibe: singer-songwriters, ambient, classical, indie folk.
 */
export default function ArtistPageMinimal({
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
  const sections = { newsletter: true, events: true, ...(artist.page_settings?.sections || {}) }
  const { logo: logoUrl, profile: profileImage } = resolvePublicArtistImages(artist)

  return (
    <div className="public-surface public-surface--minimal" style={{ ['--pub-accent' as string]: accent }}>
      <PublicAnalyticsTracker artistId={artist.id} eventType="artist_page_view" />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px' }}>
        {/* Centered hero — name only */}
        <header style={{ textAlign: 'center', marginBottom: 80 }}>
          {logoUrl && (
            <img src={logoUrl} alt="" style={{ height: 44, maxWidth: 200, objectFit: 'contain', marginBottom: 20 }} />
          )}
          {profileImage && (
            <img src={profileImage} alt={artist.name} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: 20, border: `2px solid ${accent}55` }} />
          )}
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
            <ExpandableText
              text={artist.description}
              accent={accent}
              fadeToColor="#0a0a0f"
              maxWidth={520}
              style={{ margin: '24px auto 0' }}
              paragraphStyle={{
                margin: 0,
                fontSize: 16,
                color: '#a09080',
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}
            />
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

        <PublicCreatorIdentityBlock artist={artist} songs={songs} albums={albums} accent={accent} />

        {artist.user_id && <PublicOwnerAdSlot ownerUserId={artist.user_id} placement="artist_mid" />}

        {sections.newsletter !== false && (
          <section style={{ marginBottom: 64 }}>
            <NewsletterSignup artistId={artist.id} sourcePage={`/p/${artist.page_slug}`} accent={accent} compact />
          </section>
        )}

        {sections.events !== false && (
          <PublicEventsList events={events} accent={accent} />
        )}

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

        <CreatorAcquisitionCta variant="card" accent={accent} />
        {artist.user_id && <PublicOwnerAdSlot ownerUserId={artist.user_id} placement="artist_footer" />}
        <footer style={{ textAlign: 'center', paddingTop: 32, borderTop: '1px solid rgba(180,140,80,0.08)' }}>
          <ViaToneBranding variant="footer" accent={accent} href="/login" />
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
