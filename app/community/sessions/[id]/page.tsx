import Link from 'next/link'
import { notFound } from 'next/navigation'
import V2QueuePanel from '@/components/v2/V2QueuePanel'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2StreamEngineBlock from '@/components/v2/V2StreamEngineBlock'
import { formatSessionBadge, getSessionById, V2_SESSIONS } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = { params: { id: string } }

export function generateStaticParams() {
  return V2_SESSIONS.map(s => ({ id: s.id }))
}

export default function SessionDetailPage({ params }: Props) {
  const session = getSessionById(params.id)
  if (!session) notFound()

  const badge = formatSessionBadge(session)

  return (
    <>
      <div
        className="v2-detail-hero"
        style={{ ['--v2-cover-img' as string]: `url('${session.coverImageUrl}')` }}
      >
        <div className="v2-eyebrow">
          <span className="v2-pulse" />
          {badge} · {session.platform}
        </div>
        <h1>{session.title}</h1>
        <p className="v2-meta" style={{ fontSize: 16 }}>
          Hosted by {session.hostName} ·{' '}
          <Link href={V2_ROUTES.circle(session.circleSlug)} style={{ color: 'var(--v2-brand2)' }}>
            {session.circleName}
          </Link>
        </p>
        <div className="v2-tagrow">
          {session.features.map(f => <span key={f} className="v2-tag">{f}</span>)}
        </div>
        <div className="v2-hero-actions" style={{ marginTop: 20 }}>
          <button type="button" className="v2-btn hot">Join session</button>
          <button type="button" className="v2-btn secondary">Submit song</button>
        </div>
      </div>

      <div className="v2-grid cols-2">
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Queue / playlist" lead="Now playing and upcoming tracks." />
          <div className="v2-card">
            <V2QueuePanel tracks={session.queue} />
          </div>
        </section>
        <section className="v2-section" style={{ marginTop: 0 }}>
          <V2SectionHeader title="Participation" lead="Feedback and recap placeholders." />
          <div className="v2-card">
            <div className="v2-queue">
              <div className="v2-track"><span className="num">👥</span><div><b>{session.joinedCount} joined</b><span>Live listeners</span></div></div>
              <div className="v2-track"><span className="num">💬</span><div><b>Session chat</b><span>Coming in Phase 2</span></div></div>
              <div className="v2-track"><span className="num">📋</span><div><b>Recap summary</b><span>After session ends</span></div></div>
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
