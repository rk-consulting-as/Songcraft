import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import { absoluteAppUrl } from '@/lib/appUrl'
import PrintButton from '@/components/PrintButton'
import EpkSelectedSongsList from '@/components/EpkSelectedSongsList'
import PublicEmptyState from '@/components/public/PublicEmptyState'
import { fetchEpkSelectedSongs } from '@/lib/epkSongs'
import { resolveEpkHeroImage } from '@/lib/mediaLibrary/resolveImages'
import { getUserPlan } from '@/lib/subscription'
import ViaToneBranding from '@/components/platform/ViaToneBranding'
import { t } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FALLBACK_OG_IMAGE = '/icons/icon-512.svg'
const tx = t.en as Record<string, string>

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

async function userHasPro(userId: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return false
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
  const plan = await getUserPlan(service, userId)
  return plan.id === 'pro'
}

async function fetchEpk(slug: string) {
  const { data: artist } = await sb
    .from('artists')
    .select('*')
    .eq('page_slug', slug)
    .eq('page_enabled', true)
    .eq('admin_hidden', false)
    .maybeSingle()
  if (!artist) return null
  const epk = artist.page_settings?.epk
  if (!epk?.public_enabled) return null
  if (!(await userHasPro(artist.user_id))) return null
  const selectedIds = Array.isArray(epk.selected_song_ids) ? epk.selected_song_ids : []
  const { songs } = await fetchEpkSelectedSongs(sb, {
    artistId: artist.id,
    userId: artist.user_id,
    selectedIds,
    publicOnly: true,
    fallbackLimit: 4,
  })
  return { artist, epk, songs }
}

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

function epkImage(artist: any, epk: any, songs: any[]) {
  const resolved = resolveEpkHeroImage(artist, epk, songs)
  return absoluteAppUrl(resolved || FALLBACK_OG_IMAGE)
}

function epkDescription(artist: any, epk: any) {
  return trimText(
    epk.short_bio ||
    epk.tagline ||
    artist.description ||
    [artist.genre, `${artist.name} Electronic Press Kit`].filter(Boolean).join(' · '),
    180
  )
}

export async function generateMetadata({ params }: { params: { artistSlug: string } }): Promise<Metadata> {
  const data = await fetchEpk(params.artistSlug)
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
  const url = absoluteAppUrl(`/epk/${params.artistSlug}`)
  return {
    title,
    description,
    alternates: url.startsWith('http') ? { canonical: url } : undefined,
    openGraph: {
      siteName: BRAND_NAME,
      title,
      description,
      url: url.startsWith('http') ? url : undefined,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: artist.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function EpkPage({ params }: { params: { artistSlug: string } }) {
  const data = await fetchEpk(params.artistSlug)
  if (!data) notFound()
  const { artist, epk, songs } = data
  const cover = resolveEpkHeroImage(artist, epk, songs)
  const socialLinks = Object.entries(epk.social_links || {}).filter(([, url]) => !!url) as [string, string][]

  return (
    <main className="epk-page">
      <div className="epk-shell">
        <div className="print-hide epk-topbar">
          <a href={`/p/${artist.page_slug}`} className="epk-topbar__brand">ViaTone EPK</a>
          <span className="print-button-wrap"><PrintButton /></span>
        </div>

        <section className="epk-hero">
          <div>
            {cover ? (
              <img className="epk-cover" src={cover} alt={artist.name} width={220} height={220} loading="eager" />
            ) : (
              <div className="epk-cover-fallback" aria-hidden>♪</div>
            )}
          </div>
          <div>
            <p className="epk-kicker">Electronic Press Kit</p>
            <h1 className="epk-title">{artist.name}</h1>
            {artist.genre && <p className="epk-genre">{artist.genre}</p>}
            {epk.tagline && <p className="epk-tagline">&ldquo;{epk.tagline}&rdquo;</p>}
            {epk.short_bio && <p className="epk-short-bio">{epk.short_bio}</p>}
          </div>
        </section>

        <section className="epk-body">
          <div>
            {epk.long_bio && (
              <div className="epk-block">
                <h2 className="epk-section-title">Bio</h2>
                {String(epk.long_bio).split(/\n\n+/).map((paragraph, index) => (
                  <p key={index} className="epk-prose">{paragraph}</p>
                ))}
              </div>
            )}

            {epk.release_highlight && (
              <div className="epk-block">
                <h2 className="epk-section-title">Latest Release</h2>
                <p className="epk-prose">{epk.release_highlight}</p>
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
                <p className="epk-contact">{epk.contact_info}</p>
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
                  {artist.page_slug && <a href={`/p/${artist.page_slug}`}>Public artist page</a>}
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
