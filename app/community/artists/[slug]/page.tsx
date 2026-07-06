import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SongCard from '@/components/v2/V2SongCard'
import { getArtistBySlug, V2_ARTISTS, V2_SONGS } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'
import { clientPublicUrl } from '@/lib/appUrl'

type Props = { params: { slug: string } }

export function generateStaticParams() {
  return V2_ARTISTS.map(a => ({ slug: a.slug }))
}

export default function ArtistDetailPage({ params }: Props) {
  const artist = getArtistBySlug(params.slug)
  if (!artist) notFound()

  const songs = V2_SONGS.filter(s => s.artistSlug === artist.slug)
  const publicUrl = artist.publicPageSlug ? clientPublicUrl(`/p/${artist.publicPageSlug}`) : null

  return (
    <>
      <div
        className="v2-detail-hero"
        style={{ ['--v2-cover-img' as string]: `url('${artist.coverImageUrl}')` }}
      >
        <div className="v2-artist-logo" style={{ marginTop: 0, marginBottom: 16 }}>{artist.avatarInitial}</div>
        <h1>{artist.name}</h1>
        <p className="v2-meta" style={{ fontSize: 17, maxWidth: 620 }}>{artist.bio}</p>
        <div className="v2-tagrow">
          <span className="v2-tag">{artist.genre}</span>
          {artist.platforms.map(p => <span key={p} className="v2-tag">{p}</span>)}
        </div>
        <div className="v2-hero-actions" style={{ marginTop: 20 }}>
          <button type="button" className="v2-btn hot">Follow</button>
          <button type="button" className="v2-btn secondary">Support</button>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="v2-btn secondary">
              Public page ↗
            </a>
          )}
        </div>
      </div>

      <section className="v2-section" style={{ marginTop: 0 }}>
        <V2SectionHeader title="Streaming links" lead="One place for fans to listen." />
        <div className="v2-grid cols-2">
          {artist.platforms.map(platform => (
            <div key={platform} className="v2-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ textTransform: 'capitalize' }}>{platform}</span>
              <span className="v2-btn secondary sm">Listen</span>
            </div>
          ))}
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Songs" action={<Link href={V2_ROUTES.songs} className="v2-btn secondary sm">All songs</Link>} />
        <div className="v2-grid cols-3">
          {songs.map(song => <V2SongCard key={song.id} song={song} />)}
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Circles & sessions" lead="Where this artist shows up in the community." />
        <div className="v2-card">
          <p className="v2-meta">Active in {artist.circleCount} circles · Featured in Friday Dark Country Stream</p>
          <Link href={V2_ROUTES.sessions} className="v2-btn sm" style={{ marginTop: 12 }}>Browse sessions</Link>
        </div>
      </section>
    </>
  )
}
