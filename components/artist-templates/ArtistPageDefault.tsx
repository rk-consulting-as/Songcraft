import Link from 'next/link'
import CreatorAcquisitionCta from '@/components/platform/CreatorAcquisitionCta'
import ViaToneBranding from '@/components/platform/ViaToneBranding'
import ClientEmbedPlayer from '@/components/ClientEmbedPlayer'
import ShareButtons from '@/components/ShareButtons'
import NewsletterSignup from '@/components/NewsletterSignup'
import PublicEventsList from '@/components/PublicEventsList'
import PublicAnalyticsTracker from '@/components/PublicAnalyticsTracker'
import ExpandableText from '@/components/ExpandableText'
import PublicCreatorIdentityBlock from '@/components/discover/PublicCreatorIdentityBlock'
import PublicEmptyState from '@/components/public/PublicEmptyState'
import PublicFeaturedReleaseBlock from '@/components/public/PublicFeaturedReleaseBlock'
import PublicLatestSongsGrid from '@/components/public/PublicLatestSongsGrid'
import PublicEpkTeaserSection from '@/components/public/PublicEpkTeaserSection'
import PublicPlaylistCommunitySection from '@/components/public/PublicPlaylistCommunitySection'
import PublicHeroListenCta from '@/components/public/PublicHeroListenCta'
import PublicArtistJsonLd from '@/components/public/PublicArtistJsonLd'
import PublicOwnerAdSlot from '@/components/ads/PublicOwnerAdSlot'
import { resolveFeaturedOrLatestSong } from '@/lib/creatorIdentity/compute'
import type { CreatorPageSettings } from '@/lib/creatorIdentity/types'
import { resolvePublicArtistImages } from '@/lib/mediaLibrary/resolveImages'
import { buildMusicGroupJsonLd } from '@/lib/publicArtist/metadata'
import { t } from '@/lib/i18n'

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
  epk?: {
    public_enabled?: boolean
    tagline?: string | null
    short_bio?: string | null
    release_highlight?: string | null
  }
}

type CampaignRow = {
  id: string
  title: string
  description?: string | null
  playlistTitle?: string | null
  memberCount?: number
}

type Props = {
  artist: any
  songs: any[]
  albums: any[]
  events: any[]
  campaigns?: CampaignRow[]
}

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

export default function ArtistPageDefault({ artist, songs, albums, events, campaigns = [] }: Props) {
  const tx = t.en as Record<string, string>
  const settings: PageSettings = artist.page_settings || {}
  const pageSettings = settings as CreatorPageSettings
  const s: PageSections = {
    hero: true, spotify: true, youtube: true, albums: true, songs: true, bio: true, social: true, events: true, newsletter: true,
    ...(settings.sections || {}),
  }
  const accent = settings.accent_color || '#d4a843'
  const ytIds = (settings.youtube_videos || []).map(youtubeId).filter(Boolean) as string[]
  const releasedSongs = songs.filter((sg: any) => sg.status === 'released' || sg.suno_url)
  const publicImages = resolvePublicArtistImages(artist)
  const heroImage = publicImages.hero
  const profileImage = publicImages.profile
  const logoUrl = publicImages.logo

  const featured = resolveFeaturedOrLatestSong(pageSettings, songs, albums)
  const featuredSong = featured?.type === 'song' ? songs.find((sg: any) => sg.id === featured.id) : null
  const epkSettings = settings.epk
  const epkPublic = !!(epkSettings?.public_enabled && (epkSettings.tagline || epkSettings.short_bio || epkSettings.release_highlight))

  const jsonLd = buildMusicGroupJsonLd({
    artist,
    songs,
    albums,
    slug: artist.page_slug,
    featuredAsset: null,
  })

  const firstListenHref = featured?.href || (releasedSongs[0] ? `/s/${releasedSongs[0].id}` : null)

  return (
    <div className="public-surface public-surface--v2" style={{ ['--pub-accent' as string]: accent }}>
      <PublicArtistJsonLd data={jsonLd} />
      <PublicAnalyticsTracker artistId={artist.id} eventType="artist_page_view" />

      {s.hero !== false && (
        <section
          className={`public-hero public-hero--v2${heroImage ? '' : ' public-hero--gradient-only'}`}
          style={heroImage ? { backgroundImage: `linear-gradient(180deg, rgba(10,10,15,0.55) 0%, rgba(10,10,15,0.88) 72%, #0a0a0f 100%), url(${heroImage})` } : undefined}
        >
          <div className="public-hero__inner">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="public-hero__logo" />
            )}
            {profileImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImage} alt={artist.name} className="public-hero__avatar" width={180} height={180} loading="eager" />
            )}
            <h1 className="public-hero__title">{artist.name}</h1>
            {artist.genre && (
              <div className="public-hero__genres">
                {artist.genre.split(',').map((g: string) => g.trim()).filter(Boolean).map((g: string) => (
                  <span key={g} className="public-hero__genre-chip">{g}</span>
                ))}
              </div>
            )}
            <PublicHeroListenCta
              artistName={artist.name}
              spotifyUrl={artist.spotify_verified ? artist.spotify_url : null}
              firstSongHref={firstListenHref}
              accent={accent}
              listenLabel={tx.publicListenNow}
            />
            {s.social && (
              <div className="public-social-pills">
                {artist.spotify_verified && artist.spotify_url && (
                  <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer" className="public-social-pill" style={{ background: '#1ed760', color: '#000' }}>♪ Spotify</a>
                )}
                {artist.social_links?.youtube?.url && (
                  <a href={artist.social_links.youtube.url} target="_blank" rel="noopener noreferrer" className="public-social-pill" style={{ background: '#ff0000', color: '#fff' }}>▶ YouTube</a>
                )}
                {artist.social_links?.instagram?.url && (
                  <a href={artist.social_links.instagram.url} target="_blank" rel="noopener noreferrer" className="public-social-pill" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff' }}>◎ Instagram</a>
                )}
                {artist.social_links?.website?.url && (
                  <a href={artist.social_links.website.url} target="_blank" rel="noopener noreferrer" className="public-social-pill" style={{ border: `1px solid ${accent}66`, color: accent }}>Website</a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="public-body">
        {featured && (
          <PublicFeaturedReleaseBlock
            featured={featured}
            song={featuredSong}
            artistName={artist.name}
            pageSlug={artist.page_slug}
            accent={accent}
            labels={{
              sectionTitle: tx.discoverFeaturedRelease,
              fallbackLabel: tx.publicFeaturedFallback,
              listen: tx.publicListenNow,
              openSong: tx.publicOpenSongPage,
              share: tx.publicShareRelease,
            }}
          />
        )}

        {s.songs !== false && releasedSongs.length > 0 && (
          <PublicLatestSongsGrid
            songs={releasedSongs}
            accent={accent}
            title={tx.publicLatestSongs}
            viewAllLabel={releasedSongs.length > 6 ? tx.publicViewAllTracks : undefined}
          />
        )}

        {s.bio !== false && artist.description && (
          <section className="public-section public-story-section">
            <h2 className="public-section__title">{tx.publicArtistStory}</h2>
            <ExpandableText
              text={artist.description}
              maxWidth={720}
              accent={accent}
              fadeToColor="#0a0a0f"
              paragraphStyle={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: '#c8c0b0' }}
            />
          </section>
        )}

        {s.newsletter !== false && (
          <section className="public-section public-newsletter-section">
            <NewsletterSignup artistId={artist.id} sourcePage={`/p/${artist.page_slug}`} accent={accent} />
          </section>
        )}

        {campaigns.length > 0 && (
          <PublicPlaylistCommunitySection
            campaigns={campaigns}
            accent={accent}
            labels={{
              title: tx.publicPlaylistCommunities,
              join: tx.publicJoinCommunity,
              viewAll: tx.publicViewAllCommunities,
            }}
          />
        )}

        {s.events !== false && events.length > 0 && (
          <PublicEventsList events={events} accent={accent} />
        )}

        {epkPublic && epkSettings && (
          <PublicEpkTeaserSection
            artistName={artist.name}
            pageSlug={artist.page_slug}
            epk={epkSettings}
            labels={{ title: tx.publicPressEpk, openEpk: tx.publicOpenEpk, preview: tx.epkPreview }}
          />
        )}

        <PublicCreatorIdentityBlock artist={artist} songs={songs} albums={albums} accent={accent} />

        {artist.user_id && <PublicOwnerAdSlot ownerUserId={artist.user_id} placement="artist_mid" />}

        {s.spotify && artist.spotify_id && (
          <section className="public-section">
            <h2 className="public-section__title">{tx.publicListenOnSpotify}</h2>
            <iframe
              src={`https://open.spotify.com/embed/artist/${encodeURIComponent(artist.spotify_id)}?utm_source=generator&theme=0`}
              width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" style={{ borderRadius: 12 }}
            />
          </section>
        )}

        {s.youtube && ytIds.length > 0 && (
          <section className="public-section">
            <h2 className="public-section__title">{tx.publicVideos}</h2>
            <div className="public-video-grid">
              {ytIds.map(id => (
                <div key={id} className="public-video-embed">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${id}`}
                    title="YouTube video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {s.albums && albums.length > 0 && (
          <section className="public-section">
            <h2 className="public-section__title">{tx.albums}</h2>
            <div className="public-albums-grid">
              {albums.map((al: any) => (
                <div key={al.id} className="public-card">
                  {al.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={al.cover_url} alt={al.title} className="public-albums-grid__cover" />
                  ) : (
                    <div className="public-albums-grid__cover public-albums-grid__cover--empty">💿</div>
                  )}
                  <div className="public-albums-grid__title">{al.title}</div>
                  {al.release_date && <div className="public-albums-grid__year">{al.release_date.slice(0, 4)}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {s.songs && releasedSongs.length > 0 ? (
          <section className="public-section" id="tracks">
            <h2 className="public-section__title">{tx.publicAllTracks}</h2>
            <div className="public-tracks-list">
              {releasedSongs.map((song: any, i: number) => {
                const thumb = song.spotify_cover_url || song.cover_image_url
                return (
                  <div key={song.id} className="public-track-row">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="public-track-thumb" />
                    ) : (
                      <div className="public-track-thumb public-track-thumb--empty">#{i + 1}</div>
                    )}
                    <div className="public-track-row__meta">
                      <div className="public-track-row__title">{song.title}</div>
                      {(song.spotify_album || song.spotify_release_date) && (
                        <div className="public-track-row__sub">
                          {song.spotify_album}{song.spotify_release_date ? ` · ${song.spotify_release_date.slice(0, 4)}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="public-track-row__player">
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
                    <Link href={`/s/${song.id}`} className="public-track-row__link" style={{ color: accent }}>
                      {tx.publicOpenSongPage} →
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        ) : s.songs ? (
          <section className="public-section">
            <PublicEmptyState icon="🎵" title={tx.publicEmptyNoTracks} description={tx.publicEmptyNoTracksDesc} accent={accent} />
          </section>
        ) : null}

        <section className="public-section">
          <h2 className="public-section__title">{tx.publicShareArtist}</h2>
          <ShareButtons
            url={`/p/${artist.page_slug}`}
            title={`${artist.name} — ViaTone`}
            text={`Check out ${artist.name} on ViaTone`}
            accent={accent}
          />
        </section>

        <CreatorAcquisitionCta variant="card" accent={accent} />
        {artist.user_id && <PublicOwnerAdSlot ownerUserId={artist.user_id} placement="artist_footer" />}
        <footer className="public-footer">
          <CreatorAcquisitionCta variant="footer" accent={accent} />
          <ViaToneBranding variant="footer" accent={accent} href="/login" />
        </footer>
      </div>
    </div>
  )
}
