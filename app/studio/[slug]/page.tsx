import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { markdownToHtml } from '@/lib/markdown'
import ContactForm from './ContactForm'

// Public studio / manager landing page. Server-rendered.
// URL: /studio/{slug}

export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

type StudioPage = {
  id: string
  user_id: string
  slug: string
  enabled: boolean
  name: string
  tagline: string | null
  bio: string | null
  hero_image_url: string | null
  favicon_url: string | null
  accent_color: string | null
  contact_email: string | null
  show_contact_form: boolean
  services: { title: string; description?: string }[] | null
  featured_projects: { title: string; description?: string; image_url?: string; link_url?: string }[] | null
  featured_artist_ids: string[] | null
  social_links: Record<string, { url?: string }> | null
  sections: Record<string, boolean> | null
}

async function fetchStudio(slug: string) {
  const { data: page, error } = await sb.from('studio_pages').select('*')
    .eq('slug', slug).eq('enabled', true).maybeSingle()
  if (error) console.error('[studio-page] error:', error)
  if (!page) return null
  const ids: string[] = Array.isArray(page.featured_artist_ids) ? page.featured_artist_ids : []
  let artists: any[] = []
  if (ids.length > 0) {
    const { data } = await sb.from('artists').select('id, name, genre, avatar_url, page_enabled, page_slug, spotify_image_url')
      .in('id', ids)
    artists = data || []
  }
  return { page: page as StudioPage, artists }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await fetchStudio(params.slug)
  if (!data) return { title: 'Not found' }
  const { page } = data
  const favicon = page.favicon_url || page.hero_image_url
  return {
    title: `${page.name} — Songcraft`,
    description: page.tagline || page.name,
    icons: favicon ? { icon: favicon, shortcut: favicon, apple: favicon } : undefined,
    openGraph: {
      title: page.name,
      description: page.tagline || undefined,
      images: page.hero_image_url ? [page.hero_image_url] : [],
    },
  }
}

export default async function StudioPublicPage({ params }: { params: { slug: string } }) {
  const data = await fetchStudio(params.slug)
  if (!data) notFound()
  const { page, artists } = data
  const accent = page.accent_color || '#d4a843'
  const sections: Record<string, boolean> = {
    hero: true, bio: true, artists: true, projects: true, services: true, contact: true, social: true,
    ...(page.sections || {}),
  }
  const services = page.services || []
  const projects = page.featured_projects || []
  const social = page.social_links || {}
  const bioHtml = page.bio ? markdownToHtml(page.bio) : ''

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      {/* Hero */}
      {sections.hero !== false && (
        <section style={{
          position: 'relative',
          minHeight: 360,
          padding: '70px 24px 48px',
          textAlign: 'center',
          background: page.hero_image_url
            ? `linear-gradient(180deg, rgba(10,10,15,0.55) 0%, rgba(10,10,15,0.85) 70%, #0a0a0f 100%), url(${page.hero_image_url}) center/cover no-repeat`
            : `linear-gradient(135deg, ${accent}22 0%, #0a0a0f 100%)`,
          borderBottom: `1px solid ${accent}33`,
        }}>
          <div style={{ maxWidth: 980, margin: '0 auto' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              {page.name}
            </h1>
            {page.tagline && (
              <p style={{ margin: '14px auto 0', maxWidth: 640, fontSize: 17, color: '#c8c0b0', lineHeight: 1.5 }}>
                {page.tagline}
              </p>
            )}

            {/* Social row */}
            {sections.social !== false && Object.keys(social).length > 0 && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 22 }}>
                {social.spotify?.url && (
                  <a href={social.spotify.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: '#1ed760', color: '#000', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>♪ Spotify</a>
                )}
                {social.youtube?.url && (
                  <a href={social.youtube.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: '#ff0000', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>▶ YouTube</a>
                )}
                {social.instagram?.url && (
                  <a href={social.instagram.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>◎ Instagram</a>
                )}
                {social.tiktok?.url && (
                  <a href={social.tiktok.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: '#000', border: '1px solid #fff', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>TikTok</a>
                )}
                {social.linkedin?.url && (
                  <a href={social.linkedin.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, background: '#0a66c2', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>LinkedIn</a>
                )}
                {social.website?.url && (
                  <a href={social.website.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, border: `1px solid ${accent}66`, color: accent, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>Website</a>
                )}
                {page.contact_email && (
                  <a href={`mailto:${page.contact_email}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 24, border: `1px solid ${accent}66`, color: accent, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>✉ {page.contact_email}</a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Bio */}
        {sections.bio !== false && bioHtml && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>About</h2>
            <div
              dangerouslySetInnerHTML={{ __html: bioHtml }}
              style={{ color: '#c8c0b0', fontSize: 15, lineHeight: 1.7 }}
            />
          </section>
        )}

        {/* Services */}
        {sections.services !== false && services.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Services</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {services.map((sv, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 16 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#fff' }}>{sv.title}</h3>
                  {sv.description && <p style={{ margin: 0, fontSize: 13, color: '#a09080', lineHeight: 1.5 }}>{sv.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Artist roster */}
        {sections.artists !== false && artists.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Artists</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
              {artists.map(a => {
                const cover = a.spotify_image_url || a.avatar_url
                const inner = (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, textAlign: 'center', cursor: a.page_enabled ? 'pointer' : 'default', transition: 'border-color 0.2s' }}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={a.name} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: '50%', marginBottom: 10 }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '50%', background: `${accent}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 10 }}>🎤</div>
                    )}
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{a.name}</div>
                    {a.genre && <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 4 }}>{a.genre.split(', ').slice(0, 2).join(' · ')}</div>}
                  </div>
                )
                return a.page_enabled && a.page_slug ? (
                  <Link key={a.id} href={`/p/${a.page_slug}`} style={{ textDecoration: 'none' }}>{inner}</Link>
                ) : <div key={a.id}>{inner}</div>
              })}
            </div>
          </section>
        )}

        {/* Featured projects */}
        {sections.projects !== false && projects.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Featured projects</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {projects.map((p, i) => {
                const inner = (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden', cursor: p.link_url ? 'pointer' : 'default', height: '100%' }}>
                    {p.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.title} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                    )}
                    <div style={{ padding: 14 }}>
                      <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#fff' }}>{p.title}</h3>
                      {p.description && <p style={{ margin: 0, fontSize: 13, color: '#a09080', lineHeight: 1.5 }}>{p.description}</p>}
                    </div>
                  </div>
                )
                return p.link_url ? (
                  <a key={i} href={p.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</a>
                ) : <div key={i}>{inner}</div>
              })}
            </div>
          </section>
        )}

        {/* Contact form */}
        {sections.contact !== false && page.show_contact_form && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>Get in touch</h2>
            <ContactForm
              studioPageId={page.id}
              accent={accent}
              texts={{
                title: 'Send us a message',
                name: 'Your name',
                email: 'Your email',
                message: 'Your message',
                submit: 'Send message',
                sending: 'Sending…',
                success: 'Thanks — we’ll get back to you soon.',
                error: 'Something went wrong. Please try again.',
              }}
            />
          </section>
        )}

        {/* Footer */}
        <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', color: '#5a4a30', fontSize: 12 }}>
          <Link href="/" style={{ color: '#5a4a30', textDecoration: 'none' }}>
            Powered by <span style={{ color: accent, fontWeight: 600 }}>Songcraft</span>
          </Link>
        </footer>
      </div>
    </div>
  )
}
