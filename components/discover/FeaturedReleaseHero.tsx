import Link from 'next/link'

type Featured = {
  type: 'song' | 'album'
  id: string
  title: string
  coverUrl: string | null
  href: string | null
}

type Props = {
  featured: Featured
  label: string
  accent?: string
}

export default function FeaturedReleaseHero({ featured, label, accent = '#d4a843' }: Props) {
  const inner = (
    <div className="featured-release-hero card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, marginBottom: 32, borderColor: `${accent}44` }}>
      {featured.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={featured.coverUrl} alt="" className="featured-release-hero__cover" />
      )}
      <div>
        <p className="featured-release-hero__label" style={{ color: accent }}>{label}</p>
        <h2 className="featured-release-hero__title">{featured.title}</h2>
      </div>
    </div>
  )

  if (featured.href) {
    return <Link href={featured.href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
  }
  return inner
}
