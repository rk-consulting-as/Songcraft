import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import Avatar from '@/components/Avatar'
import FollowButton from '@/components/FollowButton'
import { CREATOR_ROLES, CREATOR_LANGUAGES } from '@/lib/creatorRoles'

// Public creator profile at /u/[referral_code]. Always fresh — never cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

type Profile = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  referral_code: string
  roles: string[] | null
  location: string | null
  languages: string[] | null
  open_to_collab: boolean
  visible_in_catalog: boolean
  total_points: number
  created_at: string
}

type Artist = {
  id: string
  name: string
  genre: string
  page_enabled: boolean
  page_slug: string | null
  avatar_url: string | null
  spotify_image_url: string | null
}

async function fetchProfile(code: string): Promise<{ profile: Profile; artists: Artist[]; studioSlug: string | null; followerCount: number; followingCount: number } | null> {
  try {
    const upperCode = code.toUpperCase()

    // Try the full column set first. If a column is missing (migration pending),
    // retry with the guaranteed-existing baseline so the page still renders.
    let profile: any = null
    const fullCols = 'id, display_name, bio, avatar_url, referral_code, roles, location, languages, open_to_collab, visible_in_catalog, total_points, created_at'
    const baselineCols = 'id, display_name, bio, avatar_url, referral_code, total_points, created_at'

    const r1 = await sb
      .from('profiles')
      .select(fullCols)
      .eq('referral_code', upperCode)
      .maybeSingle()
    if (r1.error) {
      console.warn('[u/code] full select failed, retrying baseline:', r1.error.message)
      const r2 = await sb
        .from('profiles')
        .select(baselineCols)
        .eq('referral_code', upperCode)
        .maybeSingle()
      profile = r2.data
    } else {
      profile = r1.data
    }

    if (!profile) return null

    // Respect catalog opt-out only when the column exists.
    if (profile.visible_in_catalog === false) return null

    // Public artists for this user (RLS gates by page_enabled=true)
    const { data: artists, error: artistsErr } = await sb
      .from('artists')
      .select('id, name, genre, page_enabled, page_slug, avatar_url, spotify_image_url')
      .eq('user_id', profile.id)
      .eq('page_enabled', true)
      .order('name')
    if (artistsErr) console.warn('[u/code] artists query error:', artistsErr.message)

    // Studio page (if enabled)
    const { data: studio, error: studioErr } = await sb
      .from('studio_pages')
      .select('slug, enabled')
      .eq('user_id', profile.id)
      .eq('enabled', true)
      .maybeSingle()
    if (studioErr) console.warn('[u/code] studio query error:', studioErr.message)

    // Follower / following counts — these tables may not exist yet if the follows
    // migration hasn't run. Fall back to 0 silently.
    let followerCount = 0
    let followingCount = 0
    try {
      const [followerRes, followingRes] = await Promise.all([
        sb.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
        sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
      ])
      if (!followerRes.error) followerCount = followerRes.count || 0
      if (!followingRes.error) followingCount = followingRes.count || 0
    } catch (e: any) {
      console.warn('[u/code] follows count failed (table may not exist yet):', e?.message)
    }

    return {
      profile: profile as Profile,
      artists: (artists as Artist[]) || [],
      studioSlug: studio?.slug || null,
      followerCount,
      followingCount,
    }
  } catch (e: any) {
    console.error('[u/code] fetchProfile crashed:', e?.message || e)
    return null
  }
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const data = await fetchProfile(params.code)
  if (!data) return { title: 'Songcraft — Profile not found' }
  const name = data.profile.display_name || data.profile.referral_code
  return {
    title: `${name} · Songcraft`,
    description: data.profile.bio || `Creator profile on Songcraft`,
  }
}

export default async function PublicProfilePage({ params }: { params: { code: string } }) {
  const data = await fetchProfile(params.code)
  if (!data) notFound()
  const { profile, artists, studioSlug, followerCount, followingCount } = data

  const roleSet = new Set(profile.roles || [])
  const langSet = new Set(profile.languages || [])

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
          <Avatar value={profile.avatar_url} name={profile.display_name} seed={profile.id} size={140} borderColor={accent} />
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <h1 style={{ margin: 0, color: '#e8e0d0', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {profile.display_name || profile.referral_code}
            </h1>
            {profile.location && (
              <div style={{ color: '#8a7a60', fontSize: 14, marginTop: 4 }}>
                📍 {profile.location}
              </div>
            )}
            {profile.bio && (
              <p style={{ color: '#c8c0b0', fontSize: 15, marginTop: 12, lineHeight: 1.5, maxWidth: 600 }}>
                {profile.bio}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {profile.open_to_collab && (
                <span style={{
                  background: 'rgba(123,200,123,0.12)',
                  border: '1px solid rgba(123,200,123,0.4)',
                  color: '#7bc87b',
                  padding: '4px 12px',
                  fontSize: 12,
                  borderRadius: 14,
                }}>
                  🤝 Open for collab
                </span>
              )}
              {profile.total_points >= 100 && (
                <span style={{
                  background: 'rgba(212,168,67,0.12)',
                  border: '1px solid rgba(212,168,67,0.4)',
                  color: accent,
                  padding: '4px 12px',
                  fontSize: 12,
                  borderRadius: 14,
                }}>
                  ⭐ {profile.total_points.toLocaleString()} pts
                </span>
              )}
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              <FollowButton targetUserId={profile.id} targetCode={profile.referral_code} initialFollowerCount={followerCount} />
              <Link href={`/u/${profile.referral_code}/following`} style={{ display: 'flex', alignItems: 'baseline', gap: 6, textDecoration: 'none' }}>
                <strong style={{ color: '#e8e0d0', fontSize: 16, fontWeight: 700 }}>{followingCount.toLocaleString()}</strong>
                <span style={{ color: '#8a7a60', fontSize: 12 }}>following</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Roles */}
        {(profile.roles || []).length > 0 && (
          <Section title="Roles">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CREATOR_ROLES.filter(r => roleSet.has(r.key)).map(r => (
                <span key={r.key} style={{
                  background: 'rgba(212,168,67,0.08)',
                  border: '1px solid rgba(212,168,67,0.3)',
                  color: accent,
                  padding: '6px 12px',
                  borderRadius: 14,
                  fontSize: 13,
                }}>
                  {r.emoji} {labelForRole(r.key)}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Languages */}
        {(profile.languages || []).length > 0 && (
          <Section title="Creates in">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CREATOR_LANGUAGES.filter(l => langSet.has(l.key)).map(l => (
                <span key={l.key} style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(180,140,80,0.2)',
                  color: '#c8c0b0',
                  padding: '6px 12px',
                  borderRadius: 14,
                  fontSize: 13,
                }}>
                  {l.flag} {labelForLang(l.key)}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Public artists */}
        {artists.length > 0 && (
          <Section title={`Artists (${artists.length})`}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 12,
            }}>
              {artists.map(a => {
                const img = a.avatar_url || a.spotify_image_url
                const href = a.page_slug ? `/p/${a.page_slug}` : '#'
                const card = (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(180,140,80,0.2)',
                    borderRadius: 8,
                    padding: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'border-color 0.2s',
                  }}>
                    {img ? (
                      <img src={img} alt={a.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(212,168,67,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎤</div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 600 }}>{a.name}</div>
                      {a.genre && <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.genre}</div>}
                    </div>
                  </div>
                )
                return a.page_slug
                  ? <Link key={a.id} href={href} style={{ textDecoration: 'none' }}>{card}</Link>
                  : <div key={a.id}>{card}</div>
              })}
            </div>
          </Section>
        )}

        {/* Studio link */}
        {studioSlug && (
          <Section title="Studio">
            <Link href={`/studio/${studioSlug}`} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              background: 'rgba(212,168,67,0.12)',
              border: `1px solid ${accent}`,
              color: accent,
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
            }}>
              🌐 Visit studio page ↗
            </Link>
          </Section>
        )}

        {/* Member since */}
        <p style={{ color: '#5a4a30', fontSize: 11, textAlign: 'center', marginTop: 60 }}>
          Member since {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        color: '#d4a843',
        fontSize: 13,
        fontWeight: 'normal',
        letterSpacing: 1,
        textTransform: 'uppercase',
        margin: '0 0 12px',
      }}>{title}</h2>
      {children}
    </div>
  )
}

// English labels (public page is server-rendered without lang context for simplicity)
function labelForRole(key: string): string {
  const map: Record<string, string> = {
    artist: 'Artist',
    vocalist: 'Vocalist',
    songwriter: 'Songwriter',
    producer: 'Producer',
    beatmaker: 'Beatmaker',
    instrumentalist: 'Instrumentalist',
    mixer: 'Mixer',
    mastering: 'Mastering',
    manager: 'Manager',
    booking: 'Booking',
    label: 'Label',
    an_r: 'A&R',
  }
  return map[key] || key
}

function labelForLang(key: string): string {
  const map: Record<string, string> = {
    no: 'Norsk', en: 'English', sv: 'Svenska', da: 'Dansk', fi: 'Suomi', is: 'Íslenska',
  }
  return map[key] || key
}
