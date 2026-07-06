import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SongCard from '@/components/v2/V2SongCard'
import { V2_SONGS } from '@/lib/v2/mockData'

export default function SongsIndexPage() {
  return (
    <>
      <V2SectionHeader
        title="Songs"
        lead="Community-first song objects — links, feedback, sessions and public pages."
      />
      <div className="v2-grid cols-4" style={{ marginTop: 16 }}>
        {V2_SONGS.map(song => (
          <V2SongCard key={song.id} song={song} />
        ))}
      </div>
    </>
  )
}
