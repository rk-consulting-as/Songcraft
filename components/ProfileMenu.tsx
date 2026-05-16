'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

/**
 * Profile pill with dropdown menu. Collapses less-frequent header links into a
 * single avatar+name button. Items: View profile, Studio page, Feed, Referrals,
 * Settings, Admin (if applicable), Log out.
 */
export default function ProfileMenu({
  profile,
  role,
  studio,
  unreadCount = 0,
  texts,
}: {
  profile: { id: string; display_name: string | null; avatar_url: string | null; referral_code?: string | null } | null
  role: string | null
  studio: { slug: string | null; enabled: boolean } | null
  unreadCount?: number
  texts: {
    viewProfile: string
    studioView: string
    studioSetup: string
    feed: string
    analytics: string
    referrals: string
    settings: string
    admin: string
    logout: string
    guest: string
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const isAdmin = role === 'admin' || role === 'super_admin'

  const item: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    color: '#c8c0b0',
    textDecoration: 'none',
    fontSize: 13,
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    transition: 'background 0.15s',
  }
  const itemHover: React.CSSProperties = { background: 'rgba(212,168,67,0.08)' }
  const accent = '#d4a843'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px 6px 6px',
          border: '1px solid rgba(180,140,80,0.25)',
          borderRadius: 24,
          background: open ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)',
          cursor: 'pointer',
          color: '#e8e0d0',
          fontSize: 13,
          transition: 'background 0.15s, border-color 0.2s',
        }}
      >
        <Avatar value={profile?.avatar_url} name={profile?.display_name} seed={profile?.id} size={28} />
        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile?.display_name || texts.guest}
        </span>
        <span style={{ color: '#6a5a40', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: 220,
          background: '#14101a',
          border: '1px solid rgba(180,140,80,0.3)',
          borderRadius: 8,
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          padding: '6px 0',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          <Link href="/profile" onClick={() => setOpen(false)} style={item} onMouseEnter={e => Object.assign((e.target as HTMLAnchorElement).style, itemHover)} onMouseLeave={e => Object.assign((e.target as HTMLAnchorElement).style, { background: 'transparent' })}>
            👤 {texts.viewProfile}
          </Link>

          {studio?.enabled && studio.slug ? (
            <a href={`/studio/${studio.slug}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} style={item}>
              🌐 {texts.studioView} ↗
            </a>
          ) : (
            <Link href="/studio-settings" onClick={() => setOpen(false)} style={item}>
              🌐 {texts.studioSetup}
            </Link>
          )}

          <Link href="/feed" onClick={() => setOpen(false)} style={item}>
            📰 {texts.feed}
          </Link>

          <Link href="/analytics" onClick={() => setOpen(false)} style={item}>
            📊 {texts.analytics}
          </Link>

          <Link href="/referrals" onClick={() => setOpen(false)} style={item}>
            🤝 {texts.referrals}
          </Link>

          <Link href="/settings" onClick={() => setOpen(false)} style={item}>
            ⚙ {texts.settings}
          </Link>

          {isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} style={{ ...item, color: accent }}>
              ⚙️ {texts.admin}
            </Link>
          )}

          <div style={{ borderTop: '1px solid rgba(180,140,80,0.15)', margin: '4px 0' }} />

          <button onClick={logout} style={{ ...item, color: '#c05050' }}>
            ↪ {texts.logout}
          </button>
        </div>
      )}
    </div>
  )
}
