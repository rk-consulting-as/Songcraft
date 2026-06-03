import { clientPublicUrl } from '@/lib/appUrl'

type Props = {
  artistName: string
  pageSlug: string
  epk: {
    tagline?: string | null
    short_bio?: string | null
    release_highlight?: string | null
  }
  accent?: string
  labels: {
    title: string
    openEpk: string
    preview: string
  }
}

export default function PublicEpkTeaserSection({ artistName, pageSlug, epk, accent = '#7090d0', labels }: Props) {
  const blurb = epk.tagline || epk.short_bio || epk.release_highlight || ''
  if (!blurb.trim()) return null
  const epkUrl = clientPublicUrl(`/epk/${pageSlug}`)

  return (
    <section className="public-section public-epk-teaser">
      <h2 className="public-section__title" style={{ color: accent }}>{labels.title}</h2>
      <div className="public-card public-card--glass public-epk-teaser__card">
        <p className="public-epk-teaser__quote">&ldquo;{blurb.slice(0, 280)}{blurb.length > 280 ? '…' : ''}&rdquo;</p>
        <p className="public-epk-teaser__byline">— {artistName}</p>
        <a href={epkUrl} target="_blank" rel="noopener noreferrer" className="public-btn public-btn--outline" style={{ borderColor: `${accent}66`, color: accent }}>
          {labels.openEpk} ↗
        </a>
      </div>
    </section>
  )
}
