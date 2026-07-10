import Link from 'next/link'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = {
  entity: 'circle' | 'session' | 'playlist_room'
  visibility?: 'private' | 'invite'
}

const COPY: Record<Props['entity'], { title: string; description: string }> = {
  circle: {
    title: 'This circle is not public',
    description: 'This listening circle is private or invite-only. Sign in if you have access, or explore public circles on ViaTone Community.',
  },
  session: {
    title: 'This session is not public',
    description: 'This listening session belongs to a private circle. Sign in if you are a member, or browse public sessions.',
  },
  playlist_room: {
    title: 'This playlist room is not public',
    description: 'This room is linked to a private circle. Sign in if you have access, or explore public playlist rooms.',
  },
}

export default function V2PublicRestrictedState({ entity, visibility }: Props) {
  const copy = COPY[entity]
  const hint = visibility === 'invite'
    ? 'Invite-only — you need an invitation from the host to join.'
    : copy.description

  return (
    <section className="v2-section">
      <div className="v2-card v2-restricted">
        <div className="v2-eyebrow">Restricted</div>
        <h2 style={{ margin: '8px 0' }}>{copy.title}</h2>
        <p className="v2-meta" style={{ maxWidth: 520 }}>{hint}</p>
        <div className="v2-hero-actions" style={{ marginTop: 16 }}>
          <Link href={V2_ROUTES.explore} className="v2-btn hot sm">Explore Community</Link>
          <Link href={V2_ROUTES.circles} className="v2-btn secondary sm">Browse circles</Link>
        </div>
      </div>
    </section>
  )
}
