'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import Avatar from '@/components/Avatar'

type Profile = {
  id: string
  display_name: string | null
  referral_code: string
  role: string
  referred_by: string | null
  paid_status: boolean
  total_points: number
  avatar_url?: string | null
}

type Relationship = {
  id: string
  referred_id: string
  level: number
  created_at: string
}

type LedgerEntry = {
  id: string
  points: number
  source: string
  related_user_id: string | null
  notes: string | null
  created_at: string
}

export default function ReferralsPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [downline, setDownline] = useState<Relationship[]>([])
  const [downlineProfiles, setDownlineProfiles] = useState<Record<string, Profile>>({})
  const [referrer, setReferrer] = useState<Profile | null>(null)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [copied, setCopied] = useState(false)
  const [badgeThresholds, setBadgeThresholds] = useState<Record<string, number>>({
    bronze: 100, silver: 500, gold: 2000, platinum: 10000,
  })

  useEffect(() => { setLangState(useLang()); fetchAll() }, [])

  const tx = t[lang]

  const fetchAll = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const userId = session.user.id

    const [pr, rel, led, badges] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('referral_relationships')
        .select('id, referred_id, level, created_at')
        .eq('referrer_id', userId)
        .order('level', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase.from('points_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('system_settings').select('value').eq('key', 'badges.thresholds').maybeSingle(),
    ])

    if (badges?.data?.value && typeof badges.data.value === 'object') {
      setBadgeThresholds(badges.data.value as Record<string, number>)
    }

    if (pr.data) {
      const p = pr.data as Profile
      setProfile(p)
      // Fetch upline (whoever referred this user, if anyone)
      if (p.referred_by) {
        const { data: up } = await supabase.from('profiles')
          .select('id, display_name, referral_code, role, referred_by, paid_status, total_points, avatar_url')
          .eq('id', p.referred_by)
          .maybeSingle()
        if (up) setReferrer(up as Profile)
      }
    }
    if (rel.data) {
      setDownline(rel.data as Relationship[])
      // Fetch profile of each referred user for display
      const ids = Array.from(new Set((rel.data as Relationship[]).map(r => r.referred_id)))
      if (ids.length > 0) {
        const { data: ps } = await supabase.from('profiles')
          .select('id, display_name, referral_code, role, referred_by, paid_status, total_points')
          .in('id', ids)
        if (ps) {
          const map: Record<string, Profile> = {}
          for (const p of ps as Profile[]) map[p.id] = p
          setDownlineProfiles(map)
        }
      }
    }
    if (led.data) setLedger(led.data as LedgerEntry[])
    setLoading(false)
  }

  const copyLink = () => {
    if (!profile || typeof window === 'undefined') return
    const url = `${window.location.origin}/login?ref=${profile.referral_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div style={{ color: '#6a5a40', padding: 40 }}>{tx.loading}</div>
  if (!profile) return null

  const accent = '#d4a843'
  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/login?ref=${profile.referral_code}`
    : `/login?ref=${profile.referral_code}`

  // Group downline by level
  const byLevel: Record<number, Relationship[]> = {}
  for (const r of downline) {
    if (!byLevel[r.level]) byLevel[r.level] = []
    byLevel[r.level].push(r)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)', color: '#e8e0d0', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}>
      <div className="app-header" data-header="page" style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, color: accent, fontWeight: 'normal' }}>🤝 {tx.referralsTitle}</h1>
        </div>
        <Link href="/profile" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px 6px 6px',
          border: '1px solid rgba(180,140,80,0.25)',
          borderRadius: 24,
          background: 'rgba(255,255,255,0.02)',
          textDecoration: 'none',
        }} title={tx.profileTitle}>
          <Avatar value={profile.avatar_url} name={profile.display_name} seed={profile.id} size={28} />
          <span style={{ color: '#e8e0d0', fontSize: 13, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.display_name || tx.profileGuest}
          </span>
        </Link>
      </div>

      <div className="page-pad" style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: accent, lineHeight: 1 }}>{profile.total_points.toLocaleString()}</div>
            <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, marginTop: 6 }}>{tx.referralsTotalPoints.toUpperCase()}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#e8e0d0', lineHeight: 1 }}>
              {(byLevel[1] || []).length}
            </div>
            <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, marginTop: 6 }}>{tx.referralsDirectCount.toUpperCase()}</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 800, color: '#e8e0d0', lineHeight: 1 }}>{downline.length}</div>
            <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, marginTop: 6 }}>{tx.referralsTotalDownline.toUpperCase()}</div>
          </div>
        </div>

        {/* Referral link */}
        <div className="card" style={{ marginBottom: 28, borderColor: 'rgba(212,168,67,0.3)' }}>
          <h2 style={{ margin: '0 0 14px', color: accent, fontSize: 15, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase' }}>
            {tx.referralsYourLink}
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={referralUrl}
              readOnly
              onFocus={e => e.target.select()}
              style={{ flex: '1 1 280px', minWidth: 0, fontFamily: 'monospace', fontSize: 13 }}
            />
            <button className="btn-gold" onClick={copyLink}>
              {copied ? '✓ ' + tx.referralsCopied : '📋 ' + tx.referralsCopyLink}
            </button>
          </div>
          <p style={{ color: '#5a4a30', fontSize: 12, margin: '10px 0 0' }}>
            {tx.referralsLinkHint} <span style={{ color: accent, fontFamily: 'monospace' }}>{profile.referral_code}</span>
          </p>
        </div>

        {/* Upline (your referrer) */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: accent, fontSize: 15, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>
            ⬆️ {tx.referralsUplineTitle}
          </h2>
          {referrer ? (
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Avatar value={referrer.avatar_url} name={referrer.display_name} seed={referrer.id} size={56} borderColor={accent} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e8e0d0', fontSize: 16, fontWeight: 600 }}>
                  {referrer.display_name || tx.referralsAnonymous}
                </div>
                <div style={{ color: '#8a7a60', fontSize: 12, marginTop: 2 }}>
                  {tx.referralsUplineDesc} <code style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 3, color: accent, fontSize: 11 }}>{referrer.referral_code}</code>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 20, color: '#8a7a60' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>🚀</div>
              <p style={{ margin: 0, fontSize: 13 }}>{tx.referralsNoUpline}</p>
            </div>
          )}
        </div>

        {/* Badge progression */}
        <BadgeProgress
          points={profile.total_points}
          thresholds={badgeThresholds}
          tx={tx}
          accent={accent}
        />

        {/* Downline tree by level */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: accent, fontSize: 15, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>
            🌳 {tx.referralsDownline} ({downline.length})
          </h2>

          {downline.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
              <p style={{ color: '#8a7a60', margin: 0 }}>{tx.referralsEmptyDownline}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3, 4, 5].map(level => {
                const entries = byLevel[level] || []
                if (entries.length === 0) return null
                const levelColor = ['#d4a843', '#c0a043', '#a08840', '#806c33', '#605025'][level - 1]
                return (
                  <div key={level} className="card" style={{ borderLeft: `4px solid ${levelColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ color: levelColor, fontSize: 12, letterSpacing: 1, fontWeight: 600 }}>
                        {tx.referralsLevel} {level} · {level === 1 ? tx.referralsLevelDirect : tx.referralsLevelIndirect}
                      </span>
                      <span style={{ color: '#6a5a40', fontSize: 12 }}>{entries.length} {entries.length === 1 ? tx.referralsPerson : tx.referralsPeople}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {entries.map(e => {
                        const p = downlineProfiles[e.referred_id]
                        return (
                          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 28, height: 28, borderRadius: '50%', background: `${levelColor}22`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: levelColor, fontSize: 12, fontWeight: 600 }}>
                                {level}
                              </span>
                              <span style={{ color: '#e8e0d0', fontSize: 14 }}>{p?.display_name || tx.referralsAnonymous}</span>
                              {p?.paid_status && (
                                <span style={{ color: '#7bc87b', fontSize: 10, padding: '2px 8px', border: '1px solid rgba(123,200,123,0.3)', borderRadius: 10 }}>
                                  ✓ {tx.referralsPaid}
                                </span>
                              )}
                            </div>
                            <span style={{ color: '#5a4a30', fontSize: 11 }}>
                              {new Date(e.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Points history */}
        <div>
          <h2 style={{ color: accent, fontSize: 15, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>
            📊 {tx.referralsPointsHistory}
          </h2>
          {ledger.length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.referralsLedgerEmpty}</p>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {ledger.map((entry, i) => (
                <div key={entry.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px',
                  borderBottom: i < ledger.length - 1 ? '1px solid rgba(180,140,80,0.08)' : 'none',
                  flexWrap: 'wrap', gap: 8,
                }}>
                  <div>
                    <div style={{ color: '#e8e0d0', fontSize: 13 }}>{prettifySource(entry.source, tx)}</div>
                    {entry.notes && <div style={{ color: '#5a4a30', fontSize: 11 }}>{entry.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ color: '#6a5a40', fontSize: 11 }}>{new Date(entry.created_at).toLocaleDateString()}</span>
                    <span style={{ color: entry.points >= 0 ? '#7bc87b' : '#c05050', fontSize: 14, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                      {entry.points >= 0 ? '+' : ''}{entry.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Badge progression component ---------- */

const BADGE_TIERS = [
  { key: 'bronze',   color: '#c47b3e', emoji: '🥉', labelKey: 'badgeTierBronze',   benefitKey: 'badgeBenefitBronze' },
  { key: 'silver',   color: '#b8b8b8', emoji: '🥈', labelKey: 'badgeTierSilver',   benefitKey: 'badgeBenefitSilver' },
  { key: 'gold',     color: '#d4a843', emoji: '🥇', labelKey: 'badgeTierGold',     benefitKey: 'badgeBenefitGold' },
  { key: 'platinum', color: '#9ad0d4', emoji: '💎', labelKey: 'badgeTierPlatinum', benefitKey: 'badgeBenefitPlatinum' },
] as const

function BadgeProgress({ points, thresholds, tx, accent }: {
  points: number
  thresholds: Record<string, number>
  tx: any
  accent: string
}) {
  // Sort tiers by threshold ascending so we can find the current + next tier
  const tiers = BADGE_TIERS
    .map(t => ({ ...t, threshold: Number(thresholds[t.key]) || 0 }))
    .sort((a, b) => a.threshold - b.threshold)

  // Current tier = highest tier whose threshold the user has met (and which has a positive threshold)
  let current = tiers.filter(t => t.threshold > 0 && points >= t.threshold).pop() || null
  // Next tier = first tier strictly above current's threshold (and above current points)
  const next = tiers.find(t => t.threshold > 0 && t.threshold > points) || null

  const lowerBound = current?.threshold || 0
  const upperBound = next?.threshold || lowerBound
  const progressPct = next
    ? Math.min(100, Math.max(0, ((points - lowerBound) / Math.max(1, upperBound - lowerBound)) * 100))
    : 100
  const remaining = next ? Math.max(0, next.threshold - points) : 0

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ color: accent, fontSize: 15, fontWeight: 'normal', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 14px' }}>
        🏆 {tx.badgesTitle}
      </h2>

      <div className="card" style={{ marginBottom: 14 }}>
        {/* Top: current status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: current ? `${current.color}22` : 'rgba(255,255,255,0.04)',
              border: `2px solid ${current ? current.color : '#3a3530'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
            }}>
              {current ? current.emoji : '🌱'}
            </div>
            <div>
              <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                {tx.badgeCurrentTier}
              </div>
              <div style={{ color: current ? current.color : '#8a7a60', fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>
                {current ? tx[current.labelKey] : tx.badgeTierNone}
              </div>
              {current && (
                <div style={{ color: '#6a5a40', fontSize: 12, marginTop: 4 }}>
                  {tx[current.benefitKey]}
                </div>
              )}
            </div>
          </div>

          {next ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                {tx.badgeNextTier}
              </div>
              <div style={{ color: next.color, fontSize: 16, fontWeight: 600 }}>
                {next.emoji} {tx[next.labelKey]}
              </div>
              <div style={{ color: '#8a7a60', fontSize: 12, marginTop: 2 }}>
                {tx.badgePointsToGo.replace('{n}', remaining.toLocaleString())}
              </div>
            </div>
          ) : (
            <div style={{ color: '#7bc87b', fontSize: 12, fontWeight: 600 }}>
              ⭐ {tx.badgeMaxedOut}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 10, borderRadius: 5,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(180,140,80,0.15)',
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            background: next
              ? `linear-gradient(90deg, ${current?.color || '#8a7a60'} 0%, ${next.color} 100%)`
              : '#7bc87b',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#6a5a40' }}>
          <span>{lowerBound.toLocaleString()}</span>
          <span style={{ color: accent, fontWeight: 600 }}>{points.toLocaleString()} {tx.badgePointsShort}</span>
          <span>{upperBound > lowerBound ? upperBound.toLocaleString() : '∞'}</span>
        </div>
      </div>

      {/* All tiers list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {tiers.map(t => {
          const achieved = t.threshold > 0 && points >= t.threshold
          return (
            <div key={t.key} style={{
              padding: 12,
              borderRadius: 6,
              background: achieved ? `${t.color}11` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${achieved ? t.color + '55' : 'rgba(180,140,80,0.12)'}`,
              opacity: achieved ? 1 : 0.7,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 22, filter: achieved ? 'none' : 'grayscale(0.7)' }}>{t.emoji}</span>
                <div style={{ color: achieved ? t.color : '#8a7a60', fontWeight: 600, fontSize: 14 }}>
                  {tx[t.labelKey]}
                </div>
                {achieved && <span style={{ marginLeft: 'auto', color: '#7bc87b', fontSize: 14 }}>✓</span>}
              </div>
              <div style={{ color: '#8a7a60', fontSize: 11, marginBottom: 4 }}>
                {t.threshold.toLocaleString()} {tx.badgePointsShort}
              </div>
              <div style={{ color: '#6a5a40', fontSize: 11 }}>
                {tx[t.benefitKey]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function prettifySource(src: string, tx: any): string {
  if (src.startsWith('signup_l')) {
    const lvl = src.split('_l')[1]
    return `${tx.referralsSourceSignup} (${tx.referralsLevel.toLowerCase()} ${lvl})`
  }
  if (src.startsWith('paid_l')) {
    const lvl = src.split('_l')[1]
    return `${tx.referralsSourcePaid} (${tx.referralsLevel.toLowerCase()} ${lvl})`
  }
  if (src === 'manual') return tx.referralsSourceManual
  if (src === 'redemption') return tx.referralsSourceRedemption
  return src
}
