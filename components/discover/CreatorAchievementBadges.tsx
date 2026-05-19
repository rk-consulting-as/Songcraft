import type { PublicAchievement } from '@/lib/creatorIdentity'

type Props = {
  achievements: PublicAchievement[]
  max?: number
}

export default function CreatorAchievementBadges({ achievements, max = 4 }: Props) {
  const earned = achievements.filter(a => a.earned).slice(0, max)
  if (earned.length === 0) return null

  return (
    <div className="creator-achievement-badges">
      {earned.map(a => (
        <span key={a.id} className="creator-achievement-badge" title={a.label}>
          <span className="creator-achievement-icon" aria-hidden>{a.icon}</span>
          <span className="creator-achievement-label">{a.label}</span>
        </span>
      ))}
    </div>
  )
}
