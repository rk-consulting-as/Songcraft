import Link from 'next/link'
import type { CreationType, V2Circle } from '@/lib/v2/types'
import { V2_ROUTES } from '@/lib/v2/routes'

function creationTag(type: CreationType): { label: string; className: string } {
  if (type === 'human') return { label: 'Human-made', className: 'human' }
  if (type === 'fully_ai') return { label: 'Fully AI', className: 'ai' }
  if (type === 'ai_assisted') return { label: 'AI-assisted', className: 'ai' }
  return { label: 'Hybrid', className: '' }
}

type Props = {
  circle: V2Circle
  onJoin?: () => void
}

export default function V2CircleCard({ circle, onJoin }: Props) {
  return (
    <article className="v2-card">
      <div className="v2-cover" style={{ ['--v2-cover-img' as string]: `url('${circle.coverImageUrl}')` }} />
      <h4>
        <Link href={V2_ROUTES.circle(circle.slug)} style={{ color: 'inherit', textDecoration: 'none' }}>
          {circle.name}
        </Link>
      </h4>
      <p className="v2-meta">{circle.description}</p>
      <div className="v2-tagrow">
        {circle.creationTypes.map(t => {
          const tag = creationTag(t)
          return <span key={t} className={`v2-tag ${tag.className}`}>{tag.label}</span>
        })}
        {circle.platforms.map(p => (
          <span key={p} className="v2-tag">{p}</span>
        ))}
      </div>
      <div className="v2-minirow">
        <div className="v2-avatars" aria-hidden="true">
          <i className="v2-avatar" />
          <i className="v2-avatar" />
          <i className="v2-avatar" />
        </div>
        {onJoin ? (
          <button type="button" className="v2-btn secondary sm" onClick={onJoin}>Join</button>
        ) : (
          <Link href={V2_ROUTES.circle(circle.slug)} className="v2-btn secondary sm">View</Link>
        )}
      </div>
    </article>
  )
}
