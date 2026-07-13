import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SongCard from '@/components/v2/V2SongCard'
import ListeningActivityCard from '@/components/playback/ListeningActivityCard'
import { PLAYBACK_LABELS } from '@/lib/playback/types'
import { fetchCommunityArtistBySlug } from '@/lib/v2/data/artists'
import { fetchSongsForArtistId } from '@/lib/v2/data/songs'
import { V2_ROUTES } from '@/lib/v2/routes'
import { clientPublicUrl } from '@/lib/appUrl'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export default async function ArtistDetailPage({ params }: Props) {
  const { artist, fromMock } = await fetchCommunityArtistBySlug(params.slug)
  if (!artist) notFound()

  const songs = artist.legacyArtistId && !fromMock
    ? await fetchSongsForArtistId(artist.legacyArtistId)
    : []

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
          {artist.legacyArtistId && (
            <Link href={`/artist/${artist.legacyArtistId}`} className="v2-btn secondary">
              Legacy workspace
            </Link>
          )}
        </div>
      </div>

      <section className="v2-section" style={{ marginTop: 0 }}>
        <V2SectionHeader title="Songs" action={<Link href={V2_ROUTES.songs} className="v2-btn secondary sm">All songs</Link>} />
        {songs.length > 0 ? (
          <div className="v2-grid cols-3">
            {songs.map(song => <V2SongCard key={song.id} song={song} />)}
          </div>
        ) : (
          <p className="v2-meta">No songs in catalog yet.{fromMock ? ' Demo profile.' : ' Create songs in Legacy Studio.'}</p>
        )}
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Circles & sessions" lead="Where this artist shows up in the community." />
        <div className="v2-card">
          <p className="v2-meta">
            Active in {artist.circleCount || 0} circles
          </p>
          <Link href={V2_ROUTES.sessions} className="v2-btn sm" style={{ marginTop: 12 }}>Browse sessions</Link>
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader title={PLAYBACK_LABELS.participation} lead="Community listening evidence from sessions and playlist rooms featuring this artist." />
        <ListeningActivityCard
          summary={{
            available: true,
            labels: PLAYBACK_LABELS,
            sessions: [],
            report: null,
            sessionCount: 0,
            highConfidenceCount: 0,
            averageCompletion: 0,
          }}
          title={PLAYBACK_LABELS.activity}
        />
      </section>
    </>
  )
}
