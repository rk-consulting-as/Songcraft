import type { CreatorLevel } from '@/lib/creatorIdentity'

type Props = {
  level: CreatorLevel
  label: string
  compact?: boolean
}

export default function CreatorLevelBadge({ level, label, compact }: Props) {
  return (
    <span className={`creator-level-badge creator-level-badge--${level}${compact ? ' is-compact' : ''}`}>
      {label}
    </span>
  )
}
