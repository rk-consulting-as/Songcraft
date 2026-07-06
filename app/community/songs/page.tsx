import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SongCard from '@/components/v2/V2SongCard'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'

export const dynamic = 'force-dynamic'

export default async function SongsIndexPage() {
  const { songs, fromMock } = await fetchCommunitySongs()

  return (
    <>
      <V2SectionHeader
        title="Songs"
        lead="Community-first song objects — links, feedback, sessions and public pages."
      />
      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          Showing demo songs — your saved tracks from Legacy Studio will appear here automatically.
        </p>
      )}
      <div className="v2-grid cols-4" style={{ marginTop: 16 }}>
        {songs.map(song => (
          <V2SongCard key={song.id} song={song} />
        ))}
      </div>
    </>
  )
}
