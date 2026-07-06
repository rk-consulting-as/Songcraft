import Link from 'next/link'
import V2ArtistCard from '@/components/v2/V2ArtistCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { fetchCommunityArtists } from '@/lib/v2/data/artists'
import { V2_ROUTES } from '@/lib/v2/routes'

export const dynamic = 'force-dynamic'

export default async function ArtistsIndexPage() {
  const { artists, fromMock } = await fetchCommunityArtists()

  return (
    <>
      <V2SectionHeader
        title="Artists"
        lead="Beautiful music profiles — simpler than the legacy studio, built for community presence."
        action={<Link href={V2_ROUTES.legacyStudio} className="v2-btn secondary sm">+ Create in Legacy Studio</Link>}
      />
      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          Showing demo artists — add your first artist in Legacy Studio to see your catalog here.
        </p>
      )}
      <div className="v2-grid cols-3" style={{ marginTop: 16 }}>
        {artists.map(artist => (
          <V2ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
    </>
  )
}
