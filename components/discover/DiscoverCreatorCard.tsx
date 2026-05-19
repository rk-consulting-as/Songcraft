import Link from 'next/link'
import type { DiscoverCreatorCardData } from '@/lib/creatorIdentity/types'
import CreatorLevelBadge from './CreatorLevelBadge'
import CreatorAchievementBadges from './CreatorAchievementBadges'
import FeaturedOnViaToneBadge from '@/components/platform/FeaturedOnViaToneBadge'
import ViaToneBranding from '@/components/platform/ViaToneBranding'

type Props = {
  creator: DiscoverCreatorCardData
  levelLabel: string
  tx: Record<string, string>
  accent?: string
}

export default function DiscoverCreatorCard({ creator, levelLabel, tx, accent = '#d4a843' }: Props) {
  return (
    <Link href={`/p/${creator.slug}`} className="discover-creator-card card" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {creator.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={creator.imageUrl} alt="" className="discover-creator-card__img" />
        ) : (
          <div className="discover-creator-card__img discover-creator-card__img--placeholder" />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 className="discover-creator-card__name">{creator.name}</h3>
            <CreatorLevelBadge level={creator.level} label={levelLabel} compact />
            {creator.featuredOnViaTone && <FeaturedOnViaToneBadge compact />}
          </div>
          {creator.genre && (
            <p className="discover-creator-card__genre">{creator.genre}</p>
          )}
        </div>
      </div>

      {creator.featuredRelease && (
        <div className="discover-featured-release">
          <span className="discover-featured-release__label">{tx.discoverFeaturedRelease}</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {creator.featuredRelease.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.featuredRelease.coverUrl} alt="" className="discover-featured-release__cover" />
            )}
            <span className="discover-featured-release__title">{creator.featuredRelease.title}</span>
          </div>
        </div>
      )}

      <CreatorAchievementBadges achievements={creator.achievements} />

      <div className="discover-creator-card__stats">
        <span>{creator.publicReleaseCount} {tx.discoverStatReleases}</span>
        {creator.publicCampaignCount > 0 && (
          <>
            <span>·</span>
            <span>{creator.publicCampaignCount} {tx.discoverStatCampaigns}</span>
          </>
        )}
        <span>·</span>
        <span>{creator.profileCompletionPercent}% {tx.discoverStatProfile}</span>
      </div>

      <span className="discover-creator-card__cta" style={{ color: accent }}>
        {tx.discoverOpenProfile} →
      </span>
      <ViaToneBranding variant="badge" accent={accent} href="/login" />
    </Link>
  )
}
