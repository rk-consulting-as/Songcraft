import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SubmitSongPanel from '@/components/v2/V2SubmitSongPanel'
import { fetchPlaylistRoomBySlug } from '@/lib/v2/data/community'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export default async function PlaylistRoomPage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { room, fromMock } = await fetchPlaylistRoomBySlug(params.slug)
  if (!room) notFound()

  const { data: items } = fromMock
    ? { data: null }
    : await supabase
      .from('v2_playlist_room_items')
      .select('id, title, artist_name, position, external_url, created_at')
      .eq('room_id', room.id)
      .order('position', { ascending: true })

  const { songs: mySongs } = user ? await fetchCommunitySongs() : { songs: [] }

  return (
    <>
      {fromMock && <p className="v2-meta" style={{ marginBottom: 12 }}>Demo playlist room — seed migrations for live data.</p>}
      <div className="v2-detail-hero" style={{ ['--v2-cover-img' as string]: `url('${room.coverImageUrl}')` }}>
        <div className="v2-eyebrow">{room.platform} · {room.trackCount} tracks</div>
        <h1>{room.name}</h1>
        <p className="v2-meta" style={{ fontSize: 16, maxWidth: 640 }}>{room.description}</p>
        {room.circleSlug && (
          <Link href={V2_ROUTES.circle(room.circleSlug)} className="v2-btn secondary sm" style={{ marginTop: 12 }}>
            View circle
          </Link>
        )}
        {room.campaignId && (
          <Link href={`/playlist-campaigns/${room.campaignId}`} className="v2-btn secondary sm" style={{ marginTop: 12, marginLeft: 8 }}>
            Playlist campaign ↗
          </Link>
        )}
      </div>

      <section className="v2-section">
        <V2SectionHeader title="Submit to playlist room" lead="Participation is logged for community support rounds." />
        <div className="v2-card">
          <V2SubmitSongPanel target={{ type: 'playlist', slug: room.slug, label: room.name }} songs={mySongs.filter(s => s.legacySongId)} demoMode={fromMock} />
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Room queue" />
        <div className="v2-card">
          {(items || []).length === 0 && <p className="v2-meta">No tracks yet — be the first to submit.</p>}
          {(items || []).map(item => (
            <div key={item.id} className="v2-track">
              <span className="num">{item.position}</span>
              <div><b>{item.title}</b><span>{item.artist_name}</span></div>
              {item.external_url && <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="v2-meta">Open ↗</a>}
            </div>
          ))}
        </div>
        <p className="v2-meta" style={{ marginTop: 12 }}>
          {/* TODO: Aigent4U Stream Engine — sync playlist room playback */}
          Powered by Aigent4U Stream Engine — live rotation coming soon.
        </p>
      </section>
    </>
  )
}
