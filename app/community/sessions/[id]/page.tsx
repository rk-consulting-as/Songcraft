import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2ReportButton from '@/components/v2/V2ReportButton'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionRecapCard from '@/components/v2/V2SessionRecapCard'
import V2StreamEngineBlock from '@/components/v2/V2StreamEngineBlock'
import V2StreamEnginePanel from '@/components/v2/V2StreamEnginePanel'
import V2SubmitSongPanel from '@/components/v2/V2SubmitSongPanel'
import V2SupporterProfileCard from '@/components/v2/V2SupporterProfileCard'
import { fetchCommunitySessionById } from '@/lib/v2/data/community'
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

export default async function SessionDetailPage({ params }: Props) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { session, fromMock, queueRows, isHost, userJoined } = await fetchCommunitySessionById(params.id)
  if (!session) notFound()

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

  return (
    <>
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
          Hosted by {session.hostName} ·{' '}
          {session.circleSlug ? (
            <Link href={V2_ROUTES.circle(session.circleSlug)} style={{ color: 'var(--v2-brand2)' }}>
              {session.circleName}
            </Link>
          ) : session.circleName}
        </p>
        <div className="v2-tagrow">
          {session.features.map(f => <span key={f} className="v2-tag">{f}</span>)}
          <span className="v2-tag">Powered by Aigent4U</span>
        </div>
        {!fromMock && <div style={{ marginTop: 12 }}><V2ReportButton targetType="session" targetId={session.id} /></div>}
      </div>

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

      <section className="v2-section">
        <V2StreamEngineBlock />
      </section>
    </>
  )
}
