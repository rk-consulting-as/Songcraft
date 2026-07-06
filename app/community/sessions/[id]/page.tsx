import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2ReportButton from '@/components/v2/V2ReportButton'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionWorkspace from '@/components/v2/V2SessionWorkspace'
import V2StreamEngineBlock from '@/components/v2/V2StreamEngineBlock'
import V2SubmitSongPanel from '@/components/v2/V2SubmitSongPanel'
import { fetchCommunitySessionById } from '@/lib/v2/data/community'
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

  const badge = formatSessionBadge(session)
  const statusLabel = session.status === 'ended' ? 'Completed' : session.status === 'live' ? 'Live now' : 'Upcoming'

  const { songs: mySongs } = user ? await fetchCommunitySongs() : { songs: [] }
  const submitSongs = mySongs.filter(s => s.legacySongId)

  return (
    <>
      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          Demo session — live queue sync will connect via Aigent4U Stream Engine.
        </p>
      )}
      <div
        className="v2-detail-hero"
        style={{ ['--v2-cover-img' as string]: `url('${session.coverImageUrl}')` }}
      >
        <div className="v2-eyebrow">
          <span className="v2-pulse" />
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
        </div>
        {!fromMock && <div style={{ marginTop: 12 }}><V2ReportButton targetType="session" targetId={session.id} /></div>}
      </div>

      <div className="v2-grid cols-2">
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Queue / playlist" lead="Approved tracks — Stream Engine coming soon." />
          <V2SessionWorkspace
            sessionId={session.id}
            queue={queueRows}
            isHost={isHost}
            demoMode={fromMock}
            userJoined={userJoined}
          />
        </section>
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Submit your song" lead={session.status === 'ended' ? 'Session completed.' : 'Pending host approval before queue.'} />
          <div className="v2-card">
            {session.status === 'ended' ? (
              <p className="v2-meta">This session has ended. Browse upcoming sessions for the next round.</p>
            ) : (
              <V2SubmitSongPanel target={{ type: 'session', id: session.id, label: session.title }} songs={submitSongs} demoMode={fromMock} />
            )}
          </div>
          <div className="v2-card" style={{ marginTop: 16 }}>
            <div className="v2-queue">
              <div className="v2-track"><span className="num">👥</span><div><b>{session.joinedCount} joined</b><span>Listeners</span></div></div>
              <div className="v2-track"><span className="num">📋</span><div><b>Session recap</b><span>After session ends</span></div></div>
            </div>
          </div>
        </section>
      </div>

      <section className="v2-section">
        <V2StreamEngineBlock />
      </section>
    </>
  )
}
