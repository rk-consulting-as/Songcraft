import Link from 'next/link'
import type { DiscoverRelease } from '@/lib/discover/types'
import FeaturedOnViaToneBadge from '@/components/platform/FeaturedOnViaToneBadge'
import ViaToneBranding from '@/components/platform/ViaToneBranding'

type Props = {
  release: DiscoverRelease
  tx: Record<string, string>
  accent?: string
}

export default function DiscoverReleaseCard({ release, tx, accent = '#d4a843' }: Props) {
  return (
    <div className="discover-release-card card">
      <Link href={release.href} style={{ textDecoration: 'none', color: 'inherit' }}>
        {release.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={release.coverUrl} alt="" className="discover-release-card__cover" />
        ) : (
          <div className="discover-release-card__cover discover-release-card__cover--placeholder" />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 className="discover-release-card__title" style={{ margin: 0 }}>{release.title}</h3>
          {release.featuredOnViaTone && <FeaturedOnViaToneBadge compact />}
        </div>
        <span className="discover-release-card__cta">{tx.discoverListenRelease} →</span>
      </Link>
      <ViaToneBranding variant="badge" accent={accent} href="/login" />
      {release.artistSlug ? (
        <Link href={`/p/${release.artistSlug}`} className="discover-release-card__artist" style={{ color: accent }}>
          {release.artistName}
        </Link>
      ) : (
        <span className="discover-release-card__artist">{release.artistName}</span>
      )}
    </div>
  )
}
