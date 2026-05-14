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

export default async function PublicProfilePage({ params }: { params: { code: string } }) {
  const upperCode = (params.code || '').toUpperCase()
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('referral_code', upperCode)
    .maybeSingle()
  if (!profile) notFound()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#e8e0d0',
      padding: '40px 24px',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/discover" style={{ color: '#6a5a40', fontSize: 13, textDecoration: 'none' }}>
          ← Discover
        </Link>

        {/* TEST 1: Avatar component */}
        <div style={{ marginTop: 20, padding: 16, border: '1px solid rgba(180,140,80,0.2)', borderRadius: 6 }}>
          <p style={{ color: '#8a7a60', fontSize: 11, margin: 0 }}>TEST 1: Avatar component</p>
          <Avatar value={profile.avatar_url} name={profile.display_name} seed={profile.id} size={80} />
        </div>

        <h1 style={{ color: '#d4a843', fontSize: 32, margin: '20px 0 10px' }}>
          {profile.display_name || profile.referral_code}
        </h1>
        <p style={{ color: '#8a7a60' }}>Profile loaded ✓ — Avatar test active</p>
      </div>
    </div>
  )
}
