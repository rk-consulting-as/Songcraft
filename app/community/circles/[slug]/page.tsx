import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionCard from '@/components/v2/V2SessionCard'
import V2SongCard from '@/components/v2/V2SongCard'
import {
  fetchCommunityCircleBySlug,
  fetchCommunityCircles,
  fetchSessionsForCircle,
  fetchSongsForCircle,
} from '@/lib/v2/data/community'
import { V2_SUPPORTERS } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export default async function CircleDetailPage({ params }: Props) {
  const { circle, fromMock: circleMock } = await fetchCommunityCircleBySlug(params.slug)
  if (!circle) notFound()

  const [{ sessions }, { songs, fromMock: songsMock }, { circles: allCircles }] = await Promise.all([
    fetchSessionsForCircle(circle.slug, circle.id),
    fetchSongsForCircle(circle.slug),
    fetchCommunityCircles(),
  ])

  const related = allCircles.filter(c => c.slug !== circle.slug).slice(0, 3)

  return (
    <>
      {circleMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>Demo circle — your hosted circles will appear from v2_circles.</p>
      )}
      <div
        className="v2-detail-hero"
        style={{ ['--v2-cover-img' as string]: `url('${circle.coverImageUrl}')` }}
      >
        <div className="v2-eyebrow">{circle.visibility} · {circle.memberCount} members</div>
        <h1>{circle.name}</h1>
        <p className="v2-meta" style={{ fontSize: 16, maxWidth: 640 }}>{circle.description}</p>
        <div className="v2-tagrow">
          {circle.tags.map(t => <span key={t} className="v2-tag">{t}</span>)}
        </div>
        <div className="v2-hero-actions" style={{ marginTop: 20 }}>
          <button type="button" className="v2-btn hot">Join circle</button>
          <Link href={V2_ROUTES.sessions} className="v2-btn secondary">View sessions</Link>
        </div>
      </div>

      <div className="v2-grid cols-2">
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Upcoming sessions" />
          <div className="v2-grid" style={{ gap: 12 }}>
            {sessions.length ? sessions.map(s => <V2SessionCard key={s.id} session={s} compact />) : (
              <p className="v2-meta">No sessions scheduled yet.</p>
            )}
          </div>
        </section>
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Top supporters" />
          <div className="v2-card">
            {V2_SUPPORTERS.map(s => (
              <div key={s.id} className="v2-track">
                <span className="num">★</span>
                <div><b>{s.name}</b><span>{s.badge}</span></div>
                <span>{s.score}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="v2-section">
        <V2SectionHeader title="Recent song submissions" />
        {songsMock && (
          <p className="v2-meta" style={{ marginBottom: 12 }}>
            {/* TODO: join v2_session_songs with songs table for circle-scoped submissions */}
            Demo submissions until session songs are linked.
          </p>
        )}
        <div className="v2-grid cols-3">
          {songs.map(song => <V2SongCard key={song.id} song={song} />)}
        </div>
      </section>

      <section className="v2-section">
        <V2SectionHeader title="Related circles" />
        <div className="v2-grid cols-3">
          {related.map(c => (
            <V2CircleCard key={c.id} circle={c} />
          ))}
        </div>
      </section>
    </>
  )
}
