import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2CommunityAnalyticsTracker from '@/components/v2/V2CommunityAnalyticsTracker'
import V2EmptyState from '@/components/v2/V2EmptyState'
import { V2FollowCircleButton } from '@/components/v2/V2CommunityFollowSaveButtons'
import V2JsonLd from '@/components/v2/V2JsonLd'
import V2JoinCircleButton from '@/components/v2/V2JoinCircleButton'
import V2PublicAuthCta from '@/components/v2/V2PublicAuthCta'
import V2PublicRestrictedState from '@/components/v2/V2PublicRestrictedState'
import V2PostAuthCommunityAction from '@/components/v2/V2PostAuthCommunityAction'
import V2ReportButton from '@/components/v2/V2ReportButton'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionCard from '@/components/v2/V2SessionCard'
import V2ShareButton from '@/components/v2/V2ShareButton'
import V2SongCard from '@/components/v2/V2SongCard'
import V2SubmitSongPanel from '@/components/v2/V2SubmitSongPanel'
import V2SupporterProfileCard from '@/components/v2/V2SupporterProfileCard'
import {
  fetchCircleMembership,
  fetchCommunityCircleBySlug,
  fetchCommunityCircles,
  fetchSessionsForCircle,
  fetchSongsForCircle,
} from '@/lib/v2/data/community'
import { checkCircleRestricted } from '@/lib/v2/data/publicDiscovery'
import { getCircleFollowState } from '@/lib/v2/data/followsSaves'
import { fetchCircleTopSupporters, fetchUserCommunityProfile } from '@/lib/v2/data/supporters'
import { isPublicCircleVisibility, resolveCirclePublicAccess } from '@/lib/v2/publicVisibility'
import { circleCollectionJsonLd, circlePageMetadata } from '@/lib/v2/seo/communityMetadata'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'

export const dynamic = 'force-dynamic'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { circle } = await fetchCommunityCircleBySlug(params.slug)
  if (!circle || !isPublicCircleVisibility(circle.visibility)) {
    return { title: 'Circle · ViaTone Community' }
  }
  return circlePageMetadata(circle)
}

export default async function CircleDetailPage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const returnPath = V2_ROUTES.circle(params.slug)

  const { circle, fromMock: circleMock } = await fetchCommunityCircleBySlug(params.slug)

  if (!circle) {
    const restricted = await checkCircleRestricted(params.slug)
    if (restricted.exists) {
      return <V2PublicRestrictedState entity="circle" visibility={restricted.visibility === 'invite' ? 'invite' : 'private'} />
    }
    notFound()
  }

  const isMember = user ? await fetchCircleMembership(circle.slug, user.id) : false
  const access = resolveCirclePublicAccess(circle, {
    isMember,
    isOwner: user?.id === circle.ownerUserId,
  })

  if (access === 'restricted') {
    return <V2PublicRestrictedState entity="circle" visibility={circle.visibility === 'invite' ? 'invite' : 'private'} />
  }

  const isPublic = isPublicCircleVisibility(circle.visibility)
  const showMemberTools = !!user && (isMember || user.id === circle.ownerUserId)
  const followState = isPublic ? await getCircleFollowState(user?.id ?? null, circle.id) : { following: false, followerCount: circle.followerCount || 0 }

  const [{ sessions }, { songs, fromMock: songsMock }, { circles: allCircles }, userSongsRes, myProfile] = await Promise.all([
    fetchSessionsForCircle(circle.slug, circle.id),
    fetchSongsForCircle(circle.slug, circle.id, { approvedOnly: !showMemberTools }),
    fetchCommunityCircles(),
    user ? fetchCommunitySongs() : Promise.resolve({ songs: [], fromMock: false }),
    user && !circleMock ? fetchUserCommunityProfile(user.id) : Promise.resolve(null),
  ])

  const publicSongs = songs
  const publicSessions = sessions.filter(s => s.status !== 'ended' || isPublic)
  const related = allCircles.filter(c => c.slug !== circle.slug && isPublicCircleVisibility(c.visibility)).slice(0, 3)
  const mySongs = userSongsRes.songs.filter(s => s.legacySongId)

  let hostName = 'Host'
  if (circle.ownerUserId) {
    const { data: hostProfile } = await supabase.from('profiles').select('display_name').eq('id', circle.ownerUserId).maybeSingle()
    hostName = hostProfile?.display_name || hostName
  }

  return (
    <>
      {isPublic && <V2JsonLd data={circleCollectionJsonLd(circle)} />}
      <V2CommunityAnalyticsTracker entityType="circle" entityId={circle.id} />
      {user && <V2PostAuthCommunityAction isLoggedIn circleSlug={circle.slug} />}
      {circleMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>Demo circle — seed migrations populate live community data.</p>
      )}
      <div
        className="v2-detail-hero"
        style={{ ['--v2-cover-img' as string]: `url('${circle.coverImageUrl}')` }}
      >
        <div className="v2-eyebrow">{circle.visibility} · {circle.memberCount} members · {followState.followerCount} followers</div>
        <h1>{circle.name}</h1>
        <p className="v2-meta" style={{ fontSize: 16, maxWidth: 640 }}>{circle.description}</p>
        <p className="v2-meta">Hosted by{' '}
          {circle.ownerUserId ? (
            <Link href={V2_ROUTES.hostProfile(circle.ownerUserId)} style={{ color: 'var(--v2-brand2)' }}>{hostName}</Link>
          ) : hostName}
        </p>
        <div className="v2-tagrow">
          {circle.tags.map(t => <span key={t} className="v2-tag">{t}</span>)}
        </div>
        {circle.description && (
          <div className="v2-card" style={{ marginTop: 16, maxWidth: 640 }}>
            <h4 style={{ margin: '0 0 6px' }}>Community guidelines</h4>
            <p className="v2-meta" style={{ margin: 0 }}>{circle.description}</p>
          </div>
        )}
        <div className="v2-hero-actions v2-hero-cta-row" style={{ marginTop: 20 }}>
          {isPublic && (
            <V2FollowCircleButton
              slug={circle.slug}
              returnPath={returnPath}
              initialFollowing={followState.following}
              followerCount={followState.followerCount}
              isLoggedIn={!!user}
              demoMode={circleMock}
            />
          )}
          {user ? (
            <V2JoinCircleButton slug={circle.slug} initialIsMember={isMember} demoMode={circleMock} />
          ) : (
            <V2PublicAuthCta returnPath={returnPath} title="Join this circle" description="Sign in to join and submit music." compact primaryLabel="Sign in to join" />
          )}
          <Link href={V2_ROUTES.sessions} className="v2-btn secondary">View sessions</Link>
          {isPublic && (
            <V2ShareButton path={returnPath} title={circle.name} inviteMessage={`Join ${circle.name} on ViaTone Community.`} compact />
          )}
          {!circleMock && user && <V2ReportButton targetType="circle" targetId={circle.id} />}
        </div>
      </div>

      {!user && isPublic && (
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2PublicAuthCta
            returnPath={returnPath}
            title="Sign up to submit music"
            description="Create a free account, join this circle, and share your tracks for feedback and sessions."
          />
        </section>
      )}

      {showMemberTools && (
        <section className="v2-section">
          <V2SectionHeader title="Submit your song" lead="Share a track with this circle for feedback and sessions." />
          <div className="v2-card">
            {user && !isMember && (
              <p className="v2-permission-hint" style={{ marginTop: 0 }}>Join this circle before submitting a song.</p>
            )}
            <V2SubmitSongPanel target={{ type: 'circle', slug: circle.slug, label: circle.name }} songs={mySongs} demoMode={circleMock} />
          </div>
        </section>
      )}

      {myProfile && (
        <section className="v2-section">
          <V2SectionHeader title="Your community profile" lead="Participation count and badges in this community." />
          <V2SupporterProfileCard profile={myProfile} showHistoryLink compact />
        </section>
      )}

      <div className="v2-grid cols-2">
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Upcoming sessions" />
          <div className="v2-grid" style={{ gap: 12 }}>
            {publicSessions.length ? publicSessions.map(s => <V2SessionCard key={s.id} session={s} compact />) : (
              <p className="v2-meta">No sessions scheduled yet.</p>
            )}
          </div>
        </section>
        {user && isMember && (
          <section className="v2-section" style={{ marginTop: 0 }}>
            <V2SectionHeader title="Top supporters" lead="Circle participation — listening, feedback and support." />
            <SupportersBlock circleId={circle.id} circleMock={circleMock} />
          </section>
        )}
      </div>

      <section className="v2-section">
        <V2SectionHeader title="Approved submissions" lead="Public tracks shared in this circle." />
        {songsMock && <p className="v2-meta" style={{ marginBottom: 12 }}>Demo submissions until circle songs are linked.</p>}
        {publicSongs.length === 0 ? (
          <V2EmptyState
            icon="♪"
            title="No approved songs yet"
            description={user ? 'Be the first to submit a track for feedback.' : 'Sign in to submit your music to this circle.'}
            actionLabel={user ? 'Submit a song' : 'Sign in'}
            actionHref={user ? returnPath : `/login?next=${encodeURIComponent(returnPath)}`}
          />
        ) : (
          <div className="v2-grid cols-3">
            {publicSongs.map(song => <V2SongCard key={song.id} song={song} />)}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="v2-section">
          <V2SectionHeader title="Related circles" />
          <div className="v2-grid cols-3">
            {related.map(c => (
              <V2CircleCard key={c.id} circle={c} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

async function SupportersBlock({ circleId, circleMock }: { circleId: string; circleMock?: boolean }) {
  const { V2_SUPPORTERS } = await import('@/lib/v2/mockData')
  const supporters = !circleMock && circleId
    ? await fetchCircleTopSupporters(circleId)
    : V2_SUPPORTERS
  return (
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
  )
}
