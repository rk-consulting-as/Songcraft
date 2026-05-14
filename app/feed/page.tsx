'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import ActivityList, { type ActivityEntry } from '@/components/ActivityList'

type FeedMode = 'following' | 'everyone'

export default function FeedPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [mode, setMode] = useState<FeedMode>('following')
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [followCount, setFollowCount] = useState(0)

  useEffect(() => { setLangState(useLang()); load(mode) }, [mode])

  const tx = t[lang]

  const load = async (m: FeedMode) => {
    setLoading(true)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    let actorIds: string[] = []
    if (m === 'following') {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id)
      actorIds = (follows || []).map((f: any) => f.following_id)
      setFollowCount(actorIds.length)
    }

    let query = supabase
      .from('activity_feed')
      .select('id, actor_id, kind, subject_id, subject_type, subject_label, metadata, created_at')
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .limit(100)

    if (m === 'following') {
      if (actorIds.length === 0) { setEntries([]); setLoading(false); return }
      query = query.in('actor_id', actorIds)
    }

    const { data } = await query
    if (!data) { setEntries([]); setLoading(false); return }

    // Denormalise actor info
    const uniqueActorIds = Array.from(new Set((data as any[]).map(a => a.actor_id)))
    const { data: actors } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, referral_code')
      .in('id', uniqueActorIds)
    const actorMap: Record<string, { display_name: string | null; avatar_url: string | null; referral_code: string }> = {}
    for (const a of (actors as any[]) || []) actorMap[a.id] = a

    setEntries((data as any[]).map(a => ({
      ...a,
      actor_name: actorMap[a.actor_id]?.display_name || null,
      actor_avatar: actorMap[a.actor_id]?.avatar_url || null,
      actor_code: actorMap[a.actor_id]?.referral_code || null,
    })))
    setLoading(false)
  }

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
        padding: '20px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, color: accent, fontWeight: 'normal' }}>📰 {tx.feedTitle}</h1>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 32 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid rgba(180,140,80,0.15)' }}>
          <TabBtn active={mode === 'following'} onClick={() => setMode('following')}>
            👥 {tx.feedTabFollowing} {mode === 'following' && followCount > 0 && `(${followCount})`}
          </TabBtn>
          <TabBtn active={mode === 'everyone'} onClick={() => setMode('everyone')}>
            🌍 {tx.feedTabEveryone}
          </TabBtn>
        </div>

        {loading ? (
          <div style={{ color: '#6a5a40', textAlign: 'center', padding: 40 }}>{tx.loading}</div>
        ) : mode === 'following' && entries.length === 0 && followCount === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👀</div>
            <h3 style={{ color: '#e8e0d0', fontWeight: 'normal', margin: 0 }}>{tx.feedEmptyFollowingTitle}</h3>
            <p style={{ color: '#8a7a60', fontSize: 14, marginTop: 8 }}>{tx.feedEmptyFollowingDesc}</p>
            <Link href="/discover" style={{
              display: 'inline-block',
              marginTop: 14,
              padding: '10px 22px',
              background: accent,
              color: '#0a0a0f',
              textDecoration: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
            }}>🌍 {tx.discoverNavLink}</Link>
          </div>
        ) : (
          <ActivityList entries={entries} lang={lang} emptyMessage={tx.feedEmpty} />
        )}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #d4a843' : '2px solid transparent',
        color: active ? '#d4a843' : '#8a7a60',
        padding: '10px 16px',
        cursor: 'pointer',
        fontSize: 13,
        transition: 'color 0.2s, border-color 0.2s',
      }}
    >
      {children}
    </button>
  )
}
