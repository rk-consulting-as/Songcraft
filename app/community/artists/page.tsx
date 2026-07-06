import V2ArtistCard from '@/components/v2/V2ArtistCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { V2_ARTISTS } from '@/lib/v2/mockData'
import Link from 'next/link'

export default function ArtistsIndexPage() {
  return (
    <>
      <V2SectionHeader
        title="Artists"
        lead="Beautiful music profiles — simpler than the legacy studio, built for community presence."
        action={<Link href="/dashboard" className="v2-btn secondary sm">+ Create in studio</Link>}
      />
      <div className="v2-grid cols-3" style={{ marginTop: 16 }}>
        {V2_ARTISTS.map(artist => (
          <V2ArtistCard key={artist.id} artist={artist} />
        ))}
      </div>
      <p className="v2-meta" style={{ marginTop: 20 }}>
        {/* TODO: load from Supabase artists table for authenticated user */}
        MVP uses mock data. Wire to existing <code>artists</code> table in Phase 2.
      </p>
    </>
  )
}
