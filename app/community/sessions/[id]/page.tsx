import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import V2CommunityAnalyticsTracker from '@/components/v2/V2CommunityAnalyticsTracker'
import V2JsonLd from '@/components/v2/V2JsonLd'
import V2PostAuthCommunityAction from '@/components/v2/V2PostAuthCommunityAction'
import V2PublicAuthCta from '@/components/v2/V2PublicAuthCta'
import V2PublicRestrictedState from '@/components/v2/V2PublicRestrictedState'
import V2ReportButton from '@/components/v2/V2ReportButton'
import { V2SaveSessionButton } from '@/components/v2/V2CommunityFollowSaveButtons'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionRecapCard from '@/components/v2/V2SessionRecapCard'
import V2SessionRsvpCard from '@/components/v2/V2SessionRsvpCard'
import V2SessionScheduleHeader from '@/components/v2/V2SessionScheduleHeader'
import V2ShareButton from '@/components/v2/V2ShareButton'
import V2StreamEngineBlock from '@/components/v2/V2StreamEngineBlock'
import V2StreamEnginePanel from '@/components/v2/V2StreamEnginePanel'
import V2SubmitSongPanel from '@/components/v2/V2SubmitSongPanel'
import V2SupporterProfileCard from '@/components/v2/V2SupporterProfileCard'
import { fetchCommunitySessionById } from '@/lib/v2/data/community'
import { fetchSessionCircleVisibility } from '@/lib/v2/data/publicDiscovery'
import { fetchSessionRsvpCounts, fetchUserRsvpStatus } from '@/lib/v2/data/sessionCalendar'
import { getSessionSaveState } from '@/lib/v2/data/followsSaves'
import { isPublicCircleVisibility } from '@/lib/v2/publicVisibility'
import { sessionEventJsonLd, sessionPageMetadata } from '@/lib/v2/seo/communityMetadata'
import { fetchUserCommunityProfile } from '@/lib/v2/data/supporters'
import {
  fetchSessionParticipants,
  fetchSessionPlayLogs,
  fetchSessionRecap,
  parseStreamMeta,
} from '@/lib/v2/data/streamEngine'
import { formatSessionBadge } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'
import { createServerSupabase } from '@/lib/supabase/server'
import { fetchCommunitySongs } from '@/lib/v2/data/songs'

export const dynamic = 'force-dynamic'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const visibility = await fetchSessionCircleVisibility(params.id)
  if (visibility && !isPublicCircleVisibility(visibility)) {
    return { title: 'Session · ViaTone Community' }
  }
  const { session } = await fetchCommunitySessionById(params.id)
  if (!session) return { title: 'Session not found' }
  return sessionPageMetadata(session, session.circleName ? `Listening session in ${session.circleName}.` : undefined)
}

export default async function SessionDetailPage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const returnPath = V2_ROUTES.session(params.id)

  const circleVisibility = await fetchSessionCircleVisibility(params.id)
  if (circleVisibility && !isPublicCircleVisibility(circleVisibility) && !user) {
    return <V2PublicRestrictedState entity="session" visibility={circleVisibility === 'invite' ? 'invite' : 'private'} />
  }

  const { session, fromMock, queueRows, isHost, userJoined } = await fetchCommunitySessionById(params.id)
  if (!session) notFound()

  if (circleVisibility && !isPublicCircleVisibility(circleVisibility) && user) {
    const isMember = session.circleSlug
      ? await (await import('@/lib/v2/data/community')).fetchCircleMembership(session.circleSlug, user.id)
      : false
    if (!isMember && !isHost && user.id !== session.hostUserId) {
      return <V2PublicRestrictedState entity="session" visibility={circleVisibility === 'invite' ? 'invite' : 'private'} />
    }
  }

  const isPublic = !circleVisibility || isPublicCircleVisibility(circleVisibility)
  const publicQueue = queueRows.filter(q => q.status === 'approved').map(q => ({
    position: q.position,
    title: q.title,
    artistName: q.artistName,
    duration: q.duration || '',
  }))

  let playLogs: Awaited<ReturnType<typeof fetchSessionPlayLogs>> = []
  let participants: Awaited<ReturnType<typeof fetchSessionParticipants>> = []
  let hostNotes: string[] = []
  let recap = null
  let userListened = false

  if (!fromMock) {
    const { data: raw } = await supabase.from('v2_sessions').select('stream_engine_meta').eq('id', session.id).maybeSingle()
    hostNotes = parseStreamMeta(raw?.stream_engine_meta).host_notes || []
    ;[playLogs, participants] = await Promise.all([
      fetchSessionPlayLogs(session.id),
      fetchSessionParticipants(session.id),
    ])
    if (session.status === 'ended') {
      recap = await fetchSessionRecap(session.id, session.title)
    }
    if (user && userJoined) {
      const { data: part } = await supabase
        .from('v2_session_participation')
        .select('listened_at')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle()
      userListened = !!part?.listened_at
    }
  }

  const badge = formatSessionBadge(session)
  const statusLabel = session.status === 'ended' ? 'Completed' : session.status === 'live' ? 'Live now' : 'Upcoming'

  const { songs: mySongs } = user ? await fetchCommunitySongs() : { songs: [] }
  const submitSongs = mySongs.filter(s => s.legacySongId)
  const myProfile = user && !fromMock ? await fetchUserCommunityProfile(user.id) : null

  const [rsvpCounts, userRsvp, saveState] = !fromMock && session
    ? await Promise.all([
      fetchSessionRsvpCounts(session.id),
      user ? fetchUserRsvpStatus(session.id, user.id) : Promise.resolve(null),
      isPublic ? getSessionSaveState(user?.id ?? null, session.id) : Promise.resolve({ saved: false, saveCount: 0 }),
    ])
    : [{ going: 0, interested: 0, total: 0 }, null, { saved: false, saveCount: 0 }]

  return (
    <>
      {isPublic && <V2JsonLd data={sessionEventJsonLd(session)} />}
      {isPublic && <V2CommunityAnalyticsTracker entityType="session" entityId={session.id} />}
      {user && <V2PostAuthCommunityAction isLoggedIn sessionId={session.id} />}
      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          Demo session — apply migrations and seed for Stream Engine beta controls.
        </p>
      )}
      <div
        className="v2-detail-hero"
        style={{ ['--v2-cover-img' as string]: `url('${session.coverImageUrl}')` }}
      >
        <div className="v2-eyebrow">
          {session.status === 'live' && <span className="v2-pulse" />}
          {badge} · {statusLabel} · {session.platform}
        </div>
        <h1>{session.title}</h1>
        <p className="v2-meta" style={{ fontSize: 16 }}>
          Hosted by{' '}
          {session.hostUserId ? (
            <Link href={V2_ROUTES.hostProfile(session.hostUserId)} style={{ color: 'var(--v2-brand2)' }}>{session.hostName}</Link>
          ) : session.hostName}
          {' · '}
          {session.circleSlug ? (
            <Link href={V2_ROUTES.circle(session.circleSlug)} style={{ color: 'var(--v2-brand2)' }}>
              {session.circleName}
            </Link>
          ) : session.circleName}
        </p>
        {session.description && <p className="v2-meta" style={{ maxWidth: 640 }}>{session.description}</p>}
        <div className="v2-tagrow">
          {session.features.map(f => <span key={f} className="v2-tag">{f}</span>)}
          <span className="v2-tag">Powered by Aigent4U</span>
        </div>
        <div className="v2-hero-actions v2-hero-cta-row" style={{ marginTop: 12 }}>
          {isPublic && (
            <V2SaveSessionButton
              sessionId={session.id}
              returnPath={returnPath}
              initialSaved={saveState.saved}
              saveCount={saveState.saveCount}
              isLoggedIn={!!user}
              demoMode={fromMock}
            />
          )}
          {isPublic && (
            <V2ShareButton
              path={returnPath}
              title={session.title}
              inviteMessage={`Join me for ${session.title} on ViaTone.`}
              compact
            />
          )}
          {!user && <Link href={V2_ROUTES.explore} className="v2-btn secondary sm">Open Community</Link>}
        </div>
        {!fromMock && user && <div style={{ marginTop: 12 }}><V2ReportButton targetType="session" targetId={session.id} /></div>}
      </div>

      <section className="v2-section" style={{ marginTop: 0 }}>
        <V2SessionScheduleHeader session={session} isHost={isHost && !!user} demoMode={fromMock} />
      </section>

      {recap && session.status === 'ended' && (
        <section className="v2-section">
          <V2SectionHeader title="Session recap" lead="How this listening room wrapped up." />
          <V2SessionRecapCard
            recap={recap}
            circleName={session.circleName}
            circleSlug={session.circleSlug || undefined}
          />
        </section>
      )}

      {!user ? (
        <div className="v2-grid cols-2">
          <section className="v2-section" style={{ marginTop: 0 }}>
            <V2SectionHeader title="Approved queue" lead="Tracks approved for this listening session." />
            <div className="v2-card">
              {publicQueue.length === 0 ? (
                <p className="v2-meta">Queue will appear when the host approves submissions.</p>
              ) : (
                publicQueue.map(t => (
                  <div key={`${t.position}-${t.title}`} className="v2-track">
                    <span className="num">{t.position}</span>
                    <div><b>{t.title}</b><span>{t.artistName}</span></div>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="v2-section" style={{ marginTop: 0 }}>
            <div className="v2-card v2-rsvp-card">
              <h4 style={{ margin: '0 0 8px' }}>RSVP</h4>
              <div className="v2-rsvp-stats">
                <span className="v2-tag hot">{rsvpCounts.going} Going</span>
                <span className="v2-tag">{rsvpCounts.interested} Interested</span>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <V2PublicAuthCta
                returnPath={returnPath}
                title="Sign in to RSVP"
                description="Mark Going or Interested so the host knows you plan to join."
                primaryLabel="Sign in to RSVP"
              />
            </div>
            {session.status !== 'ended' && (
              <div style={{ marginTop: 16 }}>
                <V2PublicAuthCta
                  returnPath={returnPath}
                  title="Join ViaTone to submit a song"
                  description="Create a free account and share your track for host review."
                  primaryLabel="Sign up"
                  secondaryLabel="Sign in"
                />
              </div>
            )}
          </section>
        </div>
      ) : (
      <div className="v2-grid cols-2">
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Stream Engine" lead="Manual host-controlled playback — beta safe." />
          <V2StreamEnginePanel
            sessionId={session.id}
            sessionStatus={session.status}
            queue={queueRows}
            playLogs={playLogs}
            participants={participants}
            hostNotes={hostNotes}
            recap={recap}
            isHost={isHost}
            demoMode={fromMock}
            userJoined={userJoined}
            userListened={userListened}
          />
        </section>
        <section className="v2-section" style={{ marginTop: 0 }}>
          {myProfile && (
            <div style={{ marginBottom: 16 }}>
              <V2SupporterProfileCard profile={myProfile} compact />
            </div>
          )}
          <V2SessionRsvpCard
            sessionId={session.id}
            initialStatus={userRsvp}
            initialCounts={rsvpCounts}
            demoMode={fromMock}
            sessionEnded={session.status === 'ended'}
            joinedCount={session.joinedCount}
            returnPath={returnPath}
          />
          {session.status !== 'ended' && (
            <>
              <V2SectionHeader title="Submit your song" lead="Host approval before queue." />
              <div className="v2-card">
                <V2SubmitSongPanel target={{ type: 'session', id: session.id, label: session.title }} songs={submitSongs} demoMode={fromMock} />
              </div>
            </>
          )}
        </section>
      </div>
      )}

      <section className="v2-section">
        <V2StreamEngineBlock />
      </section>
    </>
  )
}
