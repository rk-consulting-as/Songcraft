import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import Avatar from '@/components/Avatar'
import FollowButton from '@/components/FollowButton'
import TopTracksList from '@/components/TopTracksList'
import { CREATOR_ROLES, CREATOR_LANGUAGES } from '@/lib/creatorRoles'

// Public creator profile at /u/[referral_code]. Always fresh — never cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

type ProfileData = {
  profile: any
  artists: any[]
  studioSlug: string | null
  followerCount: number
  followingCount: number
  topSongs: any[]
}

async function fetchProfile(code: string): Promise<ProfileData | null> {
  try {
    const upperCode = (code || '').toUpperCase()
    const { data: profileRow, error } = await sb
      .from('profiles')
      .select('*')
      .eq('referral_code', upperCode)
      .maybeSingle()
    if (error || !profileRow) return null
    if (profileRow.visible_in_catalog === false) return null

    let artists: any[] = []
    try {
      const { data } = await sb
        .from('artists')
        .select('id, name, genre, page_enabled, page_slug, avatar_url, spotify_image_url')
        .eq('user_id', profileRow.id)
        .eq('page_enabled', true)
        .order('name')
      if (data) artists = data
    } catch {}

    let studioSlug: string | null = null
    try {
      const { data } = await sb
        .from('studio_pages')
        .select('slug, enabled')
        .eq('user_id', profileRow.id)
        .eq('enabled', true)
        .maybeSingle()
      if (data) studioSlug = data.slug || null
    } catch {}

    let followerCount = 0
    let followingCount = 0
    try {
      const [a, b] = await Promise.all([
        sb.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileRow.id),
        sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileRow.id),
      ])
      if (!a.error) followerCount = a.count || 0
      if (!b.error) followingCount = b.count || 0
    } catch {}

    let topSongs: any[] = []
    try {
      const { data } = await sb
        .from('songs')
        .select('id, title, suno_audio_url, spotify_url, suno_url, media_links, cover_image_url, spotify_cover_url, internal_play_count, embed_click_count, artist_id, artists(name, page_enabled)')
        .eq('user_id', profileRow.id)
        .order('internal_play_count', { ascending: false })
        .limit(6)
      if (data) topSongs = (data as any[]).filter(s => s.artists?.page_enabled)
    } catch {}

    return { profile: profileRow, artists, studioSlug, followerCount, followingCount, topSongs }
  } catch (e: any) {
    console.error('[u/code] fetchProfile crashed:', e?.message)
    return null
  }
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  try {
    const data = await fetchProfile(params.code)
    if (!data) return { title: 'Songcraft — Profile not found' }
    const name = data.profile.display_name || data.profile.referral_code
    return {
      title: `${name} · Songcraft`,
      description: data.profile.bio || `Creator profile on Songcraft`,
    }
  } catch {
    return { title: 'Songcraft' }
  }
}

export default async function PublicProfilePage({ params }: { params: { code: string } }) {
  const data = await fetchProfile(params.code)
  if (!data) notFound()
  const { profile, artists, studioSlug, followerCount, followingCount, topSongs } = data

  // Safely extract every field with explicit defaults
  const displayName: string = typeof profile.display_name === 'string' ? profile.display_name : ''
  const referralCode: string = typeof profile.referral_code === 'string' ? profile.referral_code : ''
  const avatarUrl: string | null = typeof profile.avatar_url === 'string' ? profile.avatar_url : null
  const profileId: string = typeof profile.id === 'string' ? profile.id : ''
  const bio: string = typeof profile.bio === 'string' ? profile.bio : ''
  const location: string = typeof profile.location === 'string' ? profile.location : ''
  const totalPoints: number = typeof profile.total_points === 'number' ? profile.total_points : 0
  const openToCollab: boolean = profile.open_to_collab === true
  const rolesArray: string[] = Array.isArray(profile.roles) ? profile.roles : []
  const langsArray: string[] = Array.isArray(profile.languages) ? profile.languages : []
  const createdAt: string = typeof profile.created_at === 'string' ? profile.created_at : new Date().toISOString()

  const roleSet = new Set(rolesArray)
  const langSet = new Set(langsArray)
  const accent = '#d4a843'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Slim header */}
      <div style={{
        borderBottom: '1px solid rgba(180,140,80,0.2)',
        padding: '14px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Link href="/discover" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>
          ← Discover
        </Link>
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: 14, letterSpacing: 2 }}>
          SONGCRAFT
        </Link>
        <Link href="/login" style={{ color: '#8a7a60', textDecoration: 'none', fontSize: 13 }}>
          Sign in
        </Link>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        {/* Hero */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 32 }}>
          <Avatar value={avatarUrl} name={displayName} seed={profileId} size={140} borderColor={accent} />
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <h1 style={{ margin: 0, color: '#e8e0d0', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {displayName || referralCode}
            </h1>
            {location && (
              <div style={{ color: '#8a7a60', fontSize: 14, marginTop: 4 }}>📍 {location}</div>
            )}
            {bio && (
              <p style={{ color: '#c8c0b0', fontSize: 15, marginTop: 12, lineHeight: 1.5, maxWidth: 600 }}>{bio}</p>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {openToCollab && (
                <span style={{ background: 'rgba(123,200,123,0.12)', border: '1px solid rgba(123,200,123,0.4)', color: '#7bc87b', padding: '4px 12px', fontSize: 12, borderRadius: 14 }}>
                  🤝 Open for collab
                </span>
              )}
              {totalPoints >= 100 && (
                <span style={{ background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.4)', color: accent, padding: '4px 12px', fontSize: 12, borderRadius: 14 }}>
                  ⭐ {totalPoints.toLocaleString()} pts
                </span>
              )}
            </div>
            {profileId && (
              <div style={{ marginTop: 18, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
                <FollowButton targetUserId={profileId} targetCode={referralCode} initialFollowerCount={followerCount} />
                <Link href={`/u/${referralCode}/following`} style={{ display: 'flex', alignItems: 'baseline', gap: 6, textDecoration: 'none' }}>
                  <strong style={{ color: '#e8e0d0', fontSize: 16, fontWeight: 700 }}>{followingCount.toLocaleString()}</strong>
                  <span style={{ color: '#8a7a60', fontSize: 12 }}>following</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Roles */}
        {rolesArray.length > 0 && (
          <Section title="Roles">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CREATOR_ROLES.filter(r => roleSet.has(r.key)).map(r => (
                <span key={r.key} style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.3)', color: accent, padding: '6px 12px', borderRadius: 14, fontSize: 13 }}>
                  {r.emoji} {labelForRole(r.key)}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Languages */}
        {langsArray.length > 0 && (
          <Section title="Creates in">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CREATOR_LANGUAGES.filter(l => langSet.has(l.key)).map(l => (
                <span key={l.key} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(180,140,80,0.2)', color: '#c8c0b0', padding: '6px 12px', borderRadius: 14, fontSize: 13 }}>
                  {l.flag} {labelForLang(l.key)}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Top tracks (client-rendered) */}
        <TopTracksList songs={topSongs} />

        {/* Public artists */}
        {artists.length > 0 && (
          <Section title={`Artists (${artists.length})`}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {artists.map(a => {
                const img = a.avatar_url || a.spotify_image_url
                const href = a.page_slug ? `/p/${a.page_slug}` : null
                const card = (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,80,0.2)', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    {img ? (
                      <img src={img} alt={a.name || ''} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎤</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                      {a.genre && <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.genre}</div>}
                    </div>
                  </div>
                )
                return href
                  ? <Link key={a.id} href={href} style={{ textDecoration: 'none' }}>{card}</Link>
                  : <div key={a.id}>{card}</div>
              })}
            </div>
          </Section>
        )}

        {/* Studio link */}
        {studioSlug && (
          <Section title="Studio">
            <Link href={`/studio/${studioSlug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(212,168,67,0.12)', border: `1px solid ${accent}`, color: accent, borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
              🌐 Visit studio page ↗
            </Link>
          </Section>
        )}

        <p style={{ color: '#5a4a30', fontSize: 11, textAlign: 'center', marginTop: 60 }}>
          Member since {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ color: '#d4a843', fontSize: 13, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function labelForRole(key: string): string {
  const map: Record<string, string> = {
    artist: 'Artist', vocalist: 'Vocalist', songwriter: 'Songwriter',
    producer: 'Producer', beatmaker: 'Beatmaker', instrumentalist: 'Instrumentalist',
    mixer: 'Mixer', mastering: 'Mastering', manager: 'Manager',
    booking: 'Booking', label: 'Label', an_r: 'A&R',
  }
  return map[key] || key
}

function labelForLang(key: string): string {
  const map: Record<string, string> = {
    no: 'Norsk', en: 'English', sv: 'Svenska', da: 'Dansk', fi: 'Suomi', is: 'Íslenska',
  }
  return map[key] || key
}
