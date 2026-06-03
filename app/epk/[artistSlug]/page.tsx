import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import { absoluteAppUrl } from '@/lib/appUrl'
import PrintButton from '@/components/PrintButton'
import EpkSelectedSongsList from '@/components/EpkSelectedSongsList'
import PublicEmptyState from '@/components/public/PublicEmptyState'
import { resolveEpkHeroImage } from '@/lib/mediaLibrary/resolveImages'
import ViaToneBranding from '@/components/platform/ViaToneBranding'
import { t } from '@/lib/i18n'
import { fetchEpkPage } from '@/lib/epk/fetchEpkPage'
import { isEpkPreviewMode } from '@/lib/epk/paths'
import type { EpkSong } from '@/lib/epkSongs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FALLBACK_OG_IMAGE = '/icons/icon-512.svg'
const tx = t.en as Record<string, string>

function stripMarkup(value: unknown) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#*_`>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function trimText(value: unknown, max: number) {
  const text = stripMarkup(value)
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

function epkImage(artist: Record<string, unknown>, epk: Record<string, unknown>, songs: EpkSong[]) {
  const resolved = resolveEpkHeroImage(artist, epk, songs)
  return absoluteAppUrl(resolved || FALLBACK_OG_IMAGE)
}

function epkDescription(artist: Record<string, unknown>, epk: Record<string, unknown>) {
  return trimText(
    epk.short_bio ||
    epk.tagline ||
    artist.description ||
    [artist.genre, `${artist.name} Electronic Press Kit`].filter(Boolean).join(' · '),
    180
  )
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { artistSlug: string }
  searchParams: { preview?: string }
}): Promise<Metadata> {
  const preview = isEpkPreviewMode(searchParams)
  const data = await fetchEpkPage(params.artistSlug, preview)
  if (!data) {
    return {
      title: 'EPK not found',
      robots: { index: false, follow: false },
    }
  }
  const { artist, epk, songs } = data
  const title = trimText(`${artist.name} Electronic Press Kit`, 70)
  const description = epkDescription(artist, epk)
  const image = epkImage(artist, epk, songs)
  const url = absoluteAppUrl(`/epk/${params.artistSlug}${preview ? '?preview=1' : ''}`)
  return {
    title: preview ? `${title} (Preview)` : title,
    description,
    robots: preview ? { index: false, follow: false } : undefined,
    alternates: url.startsWith('http') ? { canonical: url } : undefined,
    openGraph: {
      siteName: BRAND_NAME,
      title,
      description,
      url: url.startsWith('http') ? url : undefined,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: String(artist.name) }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function EpkPage({
  params,
  searchParams,
}: {
  params: { artistSlug: string }
  searchParams: { preview?: string }
}) {
  const preview = isEpkPreviewMode(searchParams)
  const data = await fetchEpkPage(params.artistSlug, preview)
  if (!data) notFound()

  const { artist, epk, songs, mode } = data
  const pageSlug = String(artist.page_slug || '')
  const cover = resolveEpkHeroImage(artist, epk, songs)
  const socialLinks = Object.entries(epk.social_links || {}).filter(([, url]) => !!url) as [string, string][]

  return (
    <main className="epk-page">
      <div className="epk-shell">
        {mode === 'preview' && (
          <div className="epk-preview-banner print-hide" role="status">
            <p>{tx.epkPreviewBanner}</p>
            {!epk.public_enabled && (
              <p className="epk-preview-banner__hint">{tx.epkPreviewUnpublished}</p>
            )}
          </div>
        )}
        <div className="print-hide epk-topbar">
          <a href={pageSlug ? `/p/${pageSlug}` : '/'} className="epk-topbar__brand">ViaTone EPK</a>
          <span className="print-button-wrap"><PrintButton /></span>
        </div>

        <section className="epk-hero">
          <div>
            {cover ? (
              <img className="epk-cover" src={cover} alt={String(artist.name)} width={220} height={220} loading="eager" />
            ) : (
              <div className="epk-cover-fallback" aria-hidden>♪</div>
            )}
          </div>
          <div>
            <p className="epk-kicker">Electronic Press Kit</p>
            <h1 className="epk-title">{String(artist.name)}</h1>
            {!!artist.genre && <p className="epk-genre">{String(artist.genre)}</p>}
            {!!epk.tagline && <p className="epk-tagline">&ldquo;{String(epk.tagline)}&rdquo;</p>}
            {!!epk.short_bio && <p className="epk-short-bio">{String(epk.short_bio)}</p>}
            {!epk.short_bio && !epk.tagline && !epk.long_bio && (
              <p className="epk-short-bio epk-short-bio--muted">{tx.epkPreviewEmptyHint}</p>
            )}
          </div>
        </section>

        <section className="epk-body">
          <div>
            {!!epk.long_bio && (
              <div className="epk-block">
                <h2 className="epk-section-title">Bio</h2>
                {String(epk.long_bio).split(/\n\n+/).map((paragraph, index) => (
                  <p key={index} className="epk-prose">{paragraph}</p>
                ))}
              </div>
            )}

            {!!epk.release_highlight && (
              <div className="epk-block">
                <h2 className="epk-section-title">Latest Release</h2>
                <p className="epk-prose">{String(epk.release_highlight)}</p>
              </div>
            )}

            {songs.length > 0 ? (
              <EpkSelectedSongsList songs={songs} variant="print" heading="Selected Songs" epk={epk} />
            ) : (
              <div className="epk-block">
                <PublicEmptyState
                  icon="♪"
                  title={tx.epkEmptySongsTitle}
                  description={tx.epkEmptySongsDesc}
                  accent="#8a6a20"
                />
              </div>
            )}
          </div>

          <aside>
            <div className="epk-side-card">
              <h2 className="epk-section-title">Contact</h2>
              {epk.contact_info ? (
                <p className="epk-contact">{String(epk.contact_info)}</p>
              ) : (
                <p className="epk-contact-muted">{tx.epkContactFallback}</p>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="epk-side-card">
                <h2 className="epk-section-title">Links</h2>
                <div className="epk-link-list">
                  {socialLinks.map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer">{platform}</a>
                  ))}
                  {pageSlug && <a href={`/p/${pageSlug}`}>Public artist page</a>}
                </div>
              </div>
            )}

            <div className="print-hide epk-footer-brand">
              <ViaToneBranding variant="minimal" accent="#8a6a20" href="/login" />
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
