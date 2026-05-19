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
    <div className="public-creator-identity card" style={{ marginBottom: 24, padding: '16px 20px', borderColor: `${accent}33` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
