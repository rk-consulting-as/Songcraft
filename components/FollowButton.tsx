'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Follow / Unfollow button for a creator profile.
 * If the viewer is not logged in, the button redirects to /login.
 * If the viewer is viewing themselves, the button hides itself.
 */
export default function FollowButton({
  targetUserId,
  targetCode,
  initialFollowerCount,
}: {
  targetUserId: string
  targetCode?: string
  initialFollowerCount: number
}) {
  const router = useRouter()
  const [meId, setMeId] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [count, setCount] = useState(initialFollowerCount)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setMeId(user.id)
      // Check whether viewer follows target
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()
      setFollowing(!!data)
    }
    setLoading(false)
  }

  const toggle = async () => {
    if (!meId) {
      router.push('/login')
      return
    }
    if (meId === targetUserId) return
    setBusy(true)
    const supabase = createClient()
    if (following) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', meId)
        .eq('following_id', targetUserId)
      if (!error) { setFollowing(false); setCount(c => Math.max(0, c - 1)) }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: meId, following_id: targetUserId })
      if (!error) { setFollowing(true); setCount(c => c + 1) }
    }
    setBusy(false)
  }

  // Hide if viewing self — just show the follower count (clickable if we have a code)
  if (!loading && meId === targetUserId) {
    if (targetCode) {
      return (
        <a href={`/u/${targetCode}/followers`} style={{ ...countDisplay, textDecoration: 'none' }}>
          <strong style={countNumber}>{count.toLocaleString()}</strong>
          <span style={countLabel}>followers</span>
        </a>
      )
    }
    return (
      <div style={countDisplay}>
        <strong style={countNumber}>{count.toLocaleString()}</strong>
        <span style={countLabel}>followers</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <button
        onClick={toggle}
        disabled={busy || loading}
        style={{
          padding: '8px 18px',
          borderRadius: 6,
          border: following ? '1px solid rgba(180,140,80,0.3)' : '1px solid #d4a843',
          background: following ? 'transparent' : '#d4a843',
          color: following ? '#a09080' : '#0a0a0f',
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {loading ? '…' : following ? '✓ Following' : '+ Follow'}
      </button>
      {targetCode ? (
        <a href={`/u/${targetCode}/followers`} style={{ ...countDisplay, textDecoration: 'none' }}>
          <strong style={countNumber}>{count.toLocaleString()}</strong>
          <span style={countLabel}>followers</span>
        </a>
      ) : (
        <div style={countDisplay}>
          <strong style={countNumber}>{count.toLocaleString()}</strong>
          <span style={countLabel}>followers</span>
        </div>
      )}
    </div>
  )
}

const countDisplay: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 6 }
const countNumber: React.CSSProperties = { color: '#e8e0d0', fontSize: 16, fontWeight: 700 }
const countLabel: React.CSSProperties = { color: '#8a7a60', fontSize: 12 }
