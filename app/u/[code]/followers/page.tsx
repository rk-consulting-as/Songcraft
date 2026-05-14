import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

type FollowerRow = {
  id: string
  display_name: string | null
  avatar_url: string | null
  referral_code: string
  location: string | null
  roles: string[] | null
}

async function fetchData(code: string): Promise<{ profile: { id: string; display_name: string | null; referral_code: string }; followers: FollowerRow[] } | null> {
  const upperCode = code.toUpperCase()
  const { data: profile } = await sb
    .from('profiles')
    .select('id, display_name, referral_code, visible_in_catalog')
    .eq('referral_code', upperCode)
    .eq('visible_in_catalog', true)
    .maybeSingle()
  if (!profile) return null

  // Get follower IDs, then their profile data
  const { data: edges } = await sb
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_id', profile.id)
    .order('created_at', { ascending: false })

  if (!edges || edges.length === 0) {
    return { profile: profile as any, followers: [] }
  }

  const ids = edges.map((e: any) => e.follower_id)
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, display_name, avatar_url, referral_code, location, roles')
    .in('id', ids)
    .eq('visible_in_catalog', true)

  // Preserve order from edges
  const profileMap: Record<string, FollowerRow> = {}
  for (const p of (profiles as FollowerRow[]) || []) profileMap[p.id] = p
  const ordered = ids.map(id => profileMap[id]).filter(Boolean) as FollowerRow[]

  return { profile: profile as any, followers: ordered }
}

export default async function FollowersPage({ params }: { params: { code: string } }) {
  const data = await fetchData(params.code)
  if (!data) notFound()
  const { profile, followers } = data

  return <FollowList
    profile={profile}
    rows={followers}
    title={`Followers of ${profile.display_name || profile.referral_code}`}
    emptyText="No followers yet."
  />
}

function FollowList({ profile, rows, title, emptyText }: {
  profile: { id: string; display_name: string | null; referral_code: string }
  rows: FollowerRow[]
  title: string
  emptyText: string
}) {
  const accent = '#d4a843'
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
      color: '#e8e0d0',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        borderBottom: '1px solid rgba(180,140,80,0.2)',
        padding: '14px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Link href={`/u/${profile.referral_code}`} style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>
          ← {profile.display_name || profile.referral_code}
        </Link>
        <Link href="/" style={{ color: accent, textDecoration: 'none', fontSize: 14, letterSpacing: 2 }}>
          SONGCRAFT
        </Link>
        <div />
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ color: accent, fontSize: 24, fontWeight: 'normal', letterSpacing: 0.5, margin: '0 0 24px' }}>
          {title}
        </h1>

        {rows.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: '#8a7a60' }}>
            {emptyText}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(r => (
              <Link key={r.id} href={`/u/${r.referral_code}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12 }}>
                  <Avatar value={r.avatar_url} name={r.display_name} seed={r.id} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e8e0d0', fontSize: 14, fontWeight: 600 }}>
                      {r.display_name || r.referral_code}
                    </div>
                    <div style={{ color: '#8a7a60', fontSize: 11, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {r.location && <span>📍 {r.location}</span>}
                      {(r.roles || []).length > 0 && <span>{(r.roles || []).slice(0, 3).join(' · ')}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
