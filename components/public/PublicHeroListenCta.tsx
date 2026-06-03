import Link from 'next/link'

type Props = {
  artistName: string
  spotifyUrl?: string | null
  firstSongHref?: string | null
  accent?: string
  listenLabel: string
}

export default function PublicHeroListenCta({ artistName, spotifyUrl, firstSongHref, accent = '#d4a843', listenLabel }: Props) {
  if (spotifyUrl) {
    return (
      <a
        href={spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="public-btn public-btn--primary public-hero__listen-cta"
        style={{ background: '#1ed760', borderColor: '#1ed760', color: '#000' }}
      >
        ♪ {listenLabel}
      </a>
    )
  }
  if (firstSongHref) {
    return (
      <Link
        href={firstSongHref}
        className="public-btn public-btn--primary public-hero__listen-cta"
        style={{ background: accent, borderColor: accent }}
      >
        ▶ {listenLabel}
      </Link>
    )
  }
  return null
}
