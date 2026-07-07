import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2EmptyState from '@/components/v2/V2EmptyState'
import V2SupporterProfileCard from '@/components/v2/V2SupporterProfileCard'
import V2FeedbackPanel from '@/components/v2/V2FeedbackPanel'
import V2JoinCircleButton from '@/components/v2/V2JoinCircleButton'
import V2ReportButton from '@/components/v2/V2ReportButton'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionCard from '@/components/v2/V2SessionCard'
import V2SongCard from '@/components/v2/V2SongCard'
import V2SubmitSongPanel from '@/components/v2/V2SubmitSongPanel'
import {
  fetchCircleMembership,
  fetchCommunityCircleBySlug,
  fetchCommunityCircles,
  fetchSessionsForCircle,
  fetchSongsForCircle,
} from '@/lib/v2/data/community'
import { fetchCircleTopSupporters, fetchUserCommunityProfile } from '@/lib/v2/data/supporters'
import { V2_SUPPORTERS } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export default async function CircleDetailPage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { circle, fromMock: circleMock } = await fetchCommunityCircleBySlug(params.slug)
  if (!circle) notFound()

  const isMember = user ? await fetchCircleMembership(circle.slug, user.id) : false

  const supportersPromise = !circleMock && circle.id
    ? fetchCircleTopSupporters(circle.id)
    : Promise.resolve(V2_SUPPORTERS)
  const profilePromise = user && !circleMock
    ? fetchUserCommunityProfile(user.id)
    : Promise.resolve(null)

  const [{ sessions }, { songs, fromMock: songsMock }, { circles: allCircles }, userSongsRes, supporters, myProfile] = await Promise.all([
    fetchSessionsForCircle(circle.slug, circle.id),
    fetchSongsForCircle(circle.slug, circle.id),
    fetchCommunityCircles(),
    user ? fetchCommunitySongs() : Promise.resolve({ songs: [], fromMock: false }),
    supportersPromise,
    profilePromise,
  ])

  const related = allCircles.filter(c => c.slug !== circle.slug).slice(0, 3)
  const mySongs = userSongsRes.songs.filter(s => s.legacySongId)

  return (
    <>
      {circleMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>Demo circle — seed migrations populate live community data.</p>
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
          <V2JoinCircleButton slug={circle.slug} initialIsMember={isMember} demoMode={circleMock} />
          <Link href={V2_ROUTES.sessions} className="v2-btn secondary">View sessions</Link>
          {!circleMock && <V2ReportButton targetType="circle" targetId={circle.id} />}
        </div>
      </div>

      <section className="v2-section">
        <V2SectionHeader title="Submit your song" lead="Share a track with this circle for feedback and sessions." />
        <div className="v2-card">
          {user && !isMember && (
            <p className="v2-permission-hint" style={{ marginTop: 0 }}>Join this circle before submitting a song.</p>
          )}
          <V2SubmitSongPanel target={{ type: 'circle', slug: circle.slug, label: circle.name }} songs={mySongs} demoMode={circleMock} />
        </div>
      </section>

      {myProfile && (
        <section className="v2-section">
          <V2SectionHeader title="Your community profile" lead="Participation count and badges in this community." />
          <V2SupporterProfileCard profile={myProfile} showHistoryLink compact />
        </section>
      )}

      <div className="v2-grid cols-2">
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Sessions" />
          <div className="v2-grid" style={{ gap: 12 }}>
            {sessions.length ? sessions.map(s => <V2SessionCard key={s.id} session={s} compact />) : (
              <p className="v2-meta">No sessions scheduled yet.</p>
            )}
          </div>
        </section>
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Top supporters" lead="Circle participation — listening, feedback and support." />
          <div className="v2-card">
            {supporters.length === 0 && <p className="v2-meta">No supporters ranked yet.</p>}
            {supporters.map(s => (
              <div key={s.id} className="v2-track">
                <span className="num">★</span>
                <div><b>{s.name}</b><span>{s.badge || 'Supporter'}</span></div>
                <span>{s.score}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="v2-section">
        <V2SectionHeader title="Song submissions" />
        {songsMock && <p className="v2-meta" style={{ marginBottom: 12 }}>Demo submissions until circle songs are linked.</p>}
        {songs.length === 0 ? (
          <V2EmptyState
            icon="♪"
            title="No songs submitted yet"
            description="This is where circle members share tracks for feedback and sessions. Join and submit your song to get things started."
            actionLabel="Submit a song"
            actionHref={V2_ROUTES.circle(circle.slug)}
          />
        ) : (
          <div className="v2-grid cols-3">
            {songs.map(song => <V2SongCard key={song.id} song={song} />)}
          </div>
        )}
      </section>

      {songs[0] && !songsMock && (
        <section className="v2-section">
          <V2SectionHeader title="Circle feedback" lead="Recent notes on submissions in this circle." />
          <V2FeedbackPanel songId={songs[0].legacySongId || songs[0].id} initialFeedback={[]} circleId={circle.id} demoMode={false} />
        </section>
      )}

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
