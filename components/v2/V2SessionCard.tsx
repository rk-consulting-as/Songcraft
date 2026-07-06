import Link from 'next/link'
import type { V2Session } from '@/lib/v2/types'
import { formatSessionBadge } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'
import V2QueuePanel from './V2QueuePanel'

type Props = {
  session: V2Session
  compact?: boolean
  onJoin?: () => void
}

export default function V2SessionCard({ session, compact, onJoin }: Props) {
  const badge = formatSessionBadge(session)
  const isLive = session.status === 'live' || badge.startsWith('LIVE')

  return (
    <article className={`v2-card${compact ? '' : ' v2-session-card'}`}>
      {!compact && (
        <div
          className="v2-session-art"
          style={{ ['--v2-cover-img' as string]: `url('${session.coverImageUrl}')` }}
        >
          <span className="v2-live-badge">{badge}</span>
        </div>
      )}
      <div>
        {compact && (
          <div
            className="v2-cover v2-cover--tall"
            style={{ ['--v2-cover-img' as string]: `url('${session.coverImageUrl}')` }}
          />
        )}
        <div className="v2-tagrow">
          <span className="v2-tag">{session.platform}</span>
          {session.features.map(f => <span key={f} className="v2-tag">{f}</span>)}
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: compact ? 18 : 22 }}>
          <Link href={V2_ROUTES.session(session.id)} style={{ color: 'inherit', textDecoration: 'none' }}>
            {session.title}
          </Link>
        </h3>
        <p className="v2-meta">
          Hosted by {session.hostName} · {session.trackCount} tracks · {session.artistCount} artists
          {session.feedbackPending ? ` · ${session.feedbackPending} feedback pending` : ''}
        </p>
        {session.queue.length > 0 && <V2QueuePanel tracks={session.queue.slice(0, 3)} />}
        <div className="v2-minirow">
          <span className="v2-meta">
            {session.joinedCount} joined
            {session.seatsOpen != null ? ` · ${session.seatsOpen} seats open` : ''}
          </span>
          {onJoin ? (
            <button type="button" className={`v2-btn sm${isLive ? ' hot' : ' secondary'}`} onClick={onJoin}>
              {isLive ? 'Join session' : 'Reserve seat'}
            </button>
          ) : (
            <Link href={V2_ROUTES.session(session.id)} className="v2-btn hot sm">Open</Link>
          )}
        </div>
      </div>
    </article>
  )
}
