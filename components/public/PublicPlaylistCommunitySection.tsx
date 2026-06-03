import Link from 'next/link'

type Campaign = {
  id: string
  title: string
  description?: string | null
  memberCount?: number
  playlistTitle?: string | null
}

type Props = {
  campaigns: Campaign[]
  accent?: string
  labels: {
    title: string
    join: string
    viewAll: string
  }
}

export default function PublicPlaylistCommunitySection({ campaigns, accent = '#d4a843', labels }: Props) {
  if (campaigns.length === 0) return null

  return (
    <section className="public-section">
      <h2 className="public-section__title">{labels.title}</h2>
      <div className="public-campaign-teaser-grid">
        {campaigns.map(c => (
          <Link key={c.id} href={`/playlist-campaigns/${c.id}`} className="public-card public-campaign-teaser">
            <span className="public-campaign-teaser__title">{c.title}</span>
            {c.playlistTitle && <span className="public-campaign-teaser__playlist">{c.playlistTitle}</span>}
            {c.description && (
              <span className="public-campaign-teaser__desc">{c.description.slice(0, 120)}{c.description.length > 120 ? '…' : ''}</span>
            )}
            <span className="public-campaign-teaser__cta" style={{ color: accent }}>{labels.join} →</span>
          </Link>
        ))}
      </div>
      <Link href="/discover/campaigns" className="public-campaign-teaser__all" style={{ color: accent }}>
        {labels.viewAll} →
      </Link>
    </section>
  )
}
