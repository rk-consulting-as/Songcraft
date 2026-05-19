import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import { absoluteAppUrl } from '@/lib/appUrl'
import PrintButton from '@/components/PrintButton'
import EpkSelectedSongsList from '@/components/EpkSelectedSongsList'
import { fetchEpkSelectedSongs, getEpkSongCover } from '@/lib/epkSongs'
import { getUserPlan } from '@/lib/subscription'
import ViaToneBranding from '@/components/platform/ViaToneBranding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FALLBACK_OG_IMAGE = '/icons/icon-512.svg'

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
  const selectedSongCover = songs.map(song => getEpkSongCover(song)).find(Boolean)
  return absoluteAppUrl(
    epk.image_url ||
    epk.cover_image_url ||
    epk.press_image_url ||
    artist.spotify_image_url ||
    artist.avatar_url ||
    selectedSongCover ||
    FALLBACK_OG_IMAGE
  )
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
  const cover = epk.image_url || epk.cover_image_url || epk.press_image_url || artist.spotify_image_url || artist.avatar_url
  const socialLinks = Object.entries(epk.social_links || {}).filter(([, url]) => !!url) as [string, string][]

  return (
    <main className="epk-page" style={{ minHeight: '100vh', background: '#f6f1e8', color: '#18130c', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', padding: '28px 18px' }}>
      <style>{`
        .epk-topbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 22px; border-bottom: 1px solid rgba(80,55,20,0.12); }
        .epk-hero { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 28px; padding: 34px; }
        .epk-cover { width: 220px; height: 220px; object-fit: cover; border-radius: 16px; border: 1px solid rgba(80,55,20,0.16); }
        .epk-cover-fallback { width: 220px; height: 220px; border-radius: 16px; background: #eadcc7; display: flex; align-items: center; justify-content: center; font-size: 54px; }
        .epk-title { margin: 0; font-size: 46px; line-height: 1; color: #18130c; overflow-wrap: anywhere; }
        .epk-body { padding: 0 34px 34px; display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr); gap: 28px; }
        .epk-song-card { display: flex; gap: 12px; padding: 12px; border: 1px solid rgba(80,55,20,0.12); border-radius: 12px; background: rgba(255,255,255,0.55); min-width: 0; }
        .epk-song-cover { width: 58px; height: 58px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .epk-side-card { border: 1px solid rgba(80,55,20,0.12); border-radius: 14px; padding: 18px; background: rgba(255,255,255,0.55); margin-bottom: 16px; }
        .epk-link-list a { display: block; min-height: 34px; line-height: 34px; }
        @media (max-width: 720px) {
          .epk-page { padding: 12px 10px !important; }
          .epk-shell { border-radius: 14px !important; }
          .epk-topbar { padding: 13px 14px; align-items: flex-start; }
          .epk-topbar .print-button-wrap { display: none; }
          .epk-hero { grid-template-columns: 1fr; gap: 18px; padding: 22px 16px; text-align: center; }
          .epk-cover, .epk-cover-fallback { width: min(78vw, 260px); height: min(78vw, 260px); margin: 0 auto; }
          .epk-title { font-size: clamp(32px, 11vw, 44px); line-height: 1.05; }
          .epk-body { grid-template-columns: 1fr; padding: 0 16px 22px; gap: 20px; }
          .epk-body h2 { font-size: 13px !important; }
          .epk-body p { font-size: 15px !important; line-height: 1.65 !important; }
          .epk-song-card { flex-direction: column; padding: 14px; }
          .epk-song-cover { width: 100%; height: auto; max-height: 240px; aspect-ratio: 1 / 1; border-radius: 10px; }
          .epk-side-card { padding: 16px; }
        }
        @media print {
          body { background: #fff !important; }
          .print-hide { display: none !important; }
          .epk-shell { box-shadow: none !important; border: none !important; }
          .epk-hero { grid-template-columns: 180px minmax(0, 1fr); }
          .epk-cover, .epk-cover-fallback { width: 180px; height: 180px; }
        }
      `}</style>
      <div className="epk-shell" style={{ maxWidth: 980, margin: '0 auto', background: '#fffaf2', border: '1px solid rgba(80,55,20,0.16)', borderRadius: 18, boxShadow: '0 24px 80px rgba(80,55,20,0.12)', overflow: 'hidden' }}>
        <div className="print-hide epk-topbar">
          <a href={`/p/${artist.page_slug}`} style={{ color: '#8a6a20', textDecoration: 'none', fontSize: 13 }}>ViaTone EPK</a>
          <span className="print-button-wrap"><PrintButton /></span>
        </div>

        <section className="epk-hero">
          <div>
            {cover ? (
              <img className="epk-cover" src={cover} alt={artist.name} />
            ) : (
              <div className="epk-cover-fallback">♪</div>
            )}
          </div>
          <div>
            <div style={{ color: '#8a6a20', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Electronic Press Kit</div>
            <h1 className="epk-title">{artist.name}</h1>
            {artist.genre && <p style={{ color: '#755f3c', fontSize: 14, margin: '10px 0 0' }}>{artist.genre}</p>}
            {epk.tagline && <p style={{ color: '#8a6a20', fontSize: 21, lineHeight: 1.35, margin: '22px 0 0' }}>"{epk.tagline}"</p>}
            {epk.short_bio && <p style={{ color: '#3a3020', fontSize: 16, lineHeight: 1.65, margin: '22px 0 0' }}>{epk.short_bio}</p>}
          </div>
        </section>

        <section className="epk-body">
          <div>
            {epk.long_bio && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ color: '#8a6a20', fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase' }}>Bio</h2>
                {String(epk.long_bio).split(/\n\n+/).map((paragraph, index) => (
                  <p key={index} style={{ color: '#302818', fontSize: 14, lineHeight: 1.7 }}>{paragraph}</p>
                ))}
              </div>
            )}

            {epk.release_highlight && (
              <div style={{ marginBottom: 28 }}>
                <h2 style={{ color: '#8a6a20', fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase' }}>Latest Release</h2>
                <p style={{ color: '#302818', fontSize: 14, lineHeight: 1.7 }}>{epk.release_highlight}</p>
              </div>
            )}

            {songs.length > 0 && <EpkSelectedSongsList songs={songs} variant="print" heading="Selected Songs" />}
          </div>

          <aside>
            <div className="epk-side-card">
              <h2 style={{ color: '#8a6a20', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 0 }}>Contact</h2>
              {epk.contact_info ? (
                <p style={{ whiteSpace: 'pre-wrap', color: '#302818', fontSize: 13, lineHeight: 1.6 }}>{epk.contact_info}</p>
              ) : (
                <p style={{ color: '#755f3c', fontSize: 13 }}>Contact via artist channels.</p>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="epk-side-card">
                <h2 style={{ color: '#8a6a20', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 0 }}>Links</h2>
                <div className="epk-link-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {socialLinks.map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#302818', textDecoration: 'none', fontSize: 13, textTransform: 'capitalize' }}>{platform}</a>
                  ))}
                  {artist.page_slug && <a href={`/p/${artist.page_slug}`} style={{ color: '#302818', textDecoration: 'none', fontSize: 13 }}>Public artist page</a>}
                </div>
              </div>
            )}

            <div className="print-hide">
              <ViaToneBranding variant="minimal" accent="#8a6a20" href="/login" />
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
