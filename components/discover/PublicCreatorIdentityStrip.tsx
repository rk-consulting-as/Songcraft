import type { CreatorIdentity, PublicAchievement } from '@/lib/creatorIdentity'
import CreatorLevelBadge from './CreatorLevelBadge'
import CreatorAchievementBadges from './CreatorAchievementBadges'

type Props = {
  identity: CreatorIdentity
  levelLabel: string
  accent?: string
  memberSinceLabel?: string | null
  showAchievements?: boolean
  profileLabel?: string
  releasesLabel?: string
}

export default function PublicCreatorIdentityStrip({
  identity,
  levelLabel,
  accent = '#d4a843',
  memberSinceLabel,
  showAchievements = true,
  profileLabel = 'Profile',
  releasesLabel = 'releases',
}: Props) {
  const achievements: PublicAchievement[] = identity.achievements

  return (
    <div className="public-creator-identity card" style={{ ['--pub-accent' as string]: accent }}>
      <div className="public-creator-identity__row">
        <div className="public-creator-identity__badges">
          <CreatorLevelBadge level={identity.level} label={levelLabel} />
          {memberSinceLabel && (
            <span className="public-creator-identity__since">{memberSinceLabel}</span>
          )}
        </div>
        <div className="public-creator-identity__metrics">
          <span>{identity.profileCompletionPercent}% {profileLabel}</span>
          <span className="public-creator-identity__metric-sep">·</span>
          <span>{identity.publicReleaseCount} {releasesLabel}</span>
        </div>
      </div>
      {showAchievements && (
        <CreatorAchievementBadges achievements={achievements} max={6} />
      )}
    </div>
  )
}
