import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PrintButton from '@/components/PrintButton'
import { getUserPlan } from '@/lib/subscription'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  const { data: songs } = await sb
    .from('songs')
    .select('id, title, status, backstory, lyrics_instructions, spotify_url, suno_url, media_links, cover_image_url, spotify_cover_url, spotify_release_date')
    .eq('artist_id', artist.id)
    .eq('public_hidden', false)
    .order('position', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  const selectedSongs = selectedIds.length
    ? (songs || []).filter((song: any) => selectedIds.includes(song.id))
    : (songs || []).slice(0, 4)
  return { artist, epk, songs: selectedSongs }
}

export async function generateMetadata({ params }: { params: { artistSlug: string } }): Promise<Metadata> {
  const data = await fetchEpk(params.artistSlug)
  if (!data) return { title: 'EPK not found' }
  const { artist, epk } = data
  const cover = artist.spotify_image_url || artist.avatar_url
  return {
    title: `${artist.name} EPK`,
    description: epk.short_bio || artist.description || `${artist.name} electronic press kit`,
    openGraph: {
      title: `${artist.name} EPK`,
      description: epk.short_bio || artist.description || undefined,
      images: cover ? [cover] : [],
    },
  }
}

export default async function EpkPage({ params }: { params: { artistSlug: string } }) {
  const data = await fetchEpk(params.artistSlug)
  if (!data) notFound()
  const { artist, epk, songs } = data
  const cover = artist.spotify_image_url || artist.avatar_url
  const socialLinks = Object.entries(epk.social_links || {}).filter(([, url]) => !!url) as [string, string][]

  return (
    <main style={{ minHeight: '100vh', background: '#f6f1e8', color: '#18130c', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', padding: '28px 18px' }}>
      <style>{`
        @media print {
          body { background: #fff !important; }
          .print-hide { display: none !important; }
          .epk-shell { box-shadow: none !important; border: none !important; }
        }
      `}</style>
      <div className="epk-shell" style={{ maxWidth: 980, margin: '0 auto', background: '#fffaf2', border: '1px solid rgba(80,55,20,0.16)', borderRadius: 18, boxShadow: '0 24px 80px rgba(80,55,20,0.12)', overflow: 'hidden' }}>
        <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 22px', borderBottom: '1px solid rgba(80,55,20,0.12)' }}>
          <a href={`/p/${artist.page_slug}`} style={{ color: '#8a6a20', textDecoration: 'none', fontSize: 13 }}>Songcraft EPK</a>
          <PrintButton />
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 28, padding: 34 }}>
          <div>
            {cover ? (
              <img src={cover} alt={artist.name} style={{ width: 220, height: 220, objectFit: 'cover', borderRadius: 16, border: '1px solid rgba(80,55,20,0.16)' }} />
            ) : (
              <div style={{ width: 220, height: 220, borderRadius: 16, background: '#eadcc7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 54 }}>♪</div>
            )}
          </div>
          <div>
            <div style={{ color: '#8a6a20', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Electronic Press Kit</div>
            <h1 style={{ margin: 0, fontSize: 46, lineHeight: 1, color: '#18130c' }}>{artist.name}</h1>
            {artist.genre && <p style={{ color: '#755f3c', fontSize: 14, margin: '10px 0 0' }}>{artist.genre}</p>}
            {epk.tagline && <p style={{ color: '#8a6a20', fontSize: 21, lineHeight: 1.35, margin: '22px 0 0' }}>"{epk.tagline}"</p>}
            {epk.short_bio && <p style={{ color: '#3a3020', fontSize: 16, lineHeight: 1.65, margin: '22px 0 0' }}>{epk.short_bio}</p>}
          </div>
        </section>

        <section style={{ padding: '0 34px 34px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 0.8fr)', gap: 28 }}>
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

            {songs.length > 0 && (
              <div>
                <h2 style={{ color: '#8a6a20', fontSize: 15, letterSpacing: 1.5, textTransform: 'uppercase' }}>Selected Songs</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {songs.map((song: any) => (
                    <div key={song.id} style={{ display: 'flex', gap: 12, padding: 12, border: '1px solid rgba(80,55,20,0.12)', borderRadius: 12, background: 'rgba(255,255,255,0.55)' }}>
                      {(song.cover_image_url || song.spotify_cover_url) && <img src={song.cover_image_url || song.spotify_cover_url} alt="" style={{ width: 58, height: 58, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                      <div>
                        <h3 style={{ margin: 0, color: '#18130c', fontSize: 16 }}>{song.title}</h3>
                        {(song.backstory || song.lyrics_instructions) && (
                          <p style={{ color: '#5f5138', fontSize: 13, lineHeight: 1.45, margin: '5px 0 0' }}>
                            {String(song.backstory || song.lyrics_instructions).slice(0, 180)}
                            {String(song.backstory || song.lyrics_instructions).length > 180 ? '...' : ''}
                          </p>
                        )}
                        {song.spotify_url && <a href={song.spotify_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1a7f3c', fontSize: 12 }}>Spotify</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside>
            <div style={{ border: '1px solid rgba(80,55,20,0.12)', borderRadius: 14, padding: 18, background: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
              <h2 style={{ color: '#8a6a20', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 0 }}>Contact</h2>
              {epk.contact_info ? (
                <p style={{ whiteSpace: 'pre-wrap', color: '#302818', fontSize: 13, lineHeight: 1.6 }}>{epk.contact_info}</p>
              ) : (
                <p style={{ color: '#755f3c', fontSize: 13 }}>Contact via artist channels.</p>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div style={{ border: '1px solid rgba(80,55,20,0.12)', borderRadius: 14, padding: 18, background: 'rgba(255,255,255,0.55)', marginBottom: 16 }}>
                <h2 style={{ color: '#8a6a20', fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 0 }}>Links</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {socialLinks.map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#302818', textDecoration: 'none', fontSize: 13, textTransform: 'capitalize' }}>{platform}</a>
                  ))}
                  {artist.page_slug && <a href={`/p/${artist.page_slug}`} style={{ color: '#302818', textDecoration: 'none', fontSize: 13 }}>Public artist page</a>}
                </div>
              </div>
            )}

            <div className="print-hide" style={{ color: '#755f3c', fontSize: 11, lineHeight: 1.5 }}>
              Powered by Songcraft
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
