import Link from 'next/link'
import type { DiscoverRelease } from '@/lib/discover/types'

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
        <h3 className="discover-release-card__title">{release.title}</h3>
        <span className="discover-release-card__cta">{tx.discoverListenRelease} →</span>
      </Link>
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
