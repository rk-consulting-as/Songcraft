'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'

type Role = 'user' | 'moderator' | 'admin' | 'super_admin'

type Profile = {
  id: string
  display_name: string | null
  referral_code: string
  role: Role
  referred_by: string | null
  paid_status: boolean
  paid_at: string | null
  total_points: number
  created_at: string
  updated_at: string
}

type LedgerEntry = {
  id: string
  user_id: string
  points: number
  source: string
  related_user_id: string | null
  notes: string | null
  created_at: string
}

type SettingRow = { key: string; value: any; description: string | null }

type Tab = 'users' | 'settings' | 'ledger'

const ROLES: Role[] = ['user', 'moderator', 'admin', 'super_admin']

export default function AdminPage() {
  const router = useRouter()
  const [lang, setLangState] = useState<Lang>('no')
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<Profile | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  const [tab, setTab] = useState<Tab>('users')

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({})
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all')

  const [settings, setSettings] = useState<SettingRow[]>([])
  // For known keys (points.signup, points.paid, badges.thresholds) we store parsed
  // objects. For unknown keys we fall back to a JSON string.
  const [settingsDraft, setSettingsDraft] = useState<Record<string, any>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null)

  const [ledger, setLedger] = useState<LedgerEntry[]>([])

  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => { setLangState(useLang()); init() }, [])
  const tx = t[lang]

  const init = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const myId = session.user.id

    const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', myId).single()
    if (!myProfile || !['admin', 'super_admin'].includes((myProfile as Profile).role)) {
      setAccessDenied(true)
      setLoading(false)
      return
    }
    setMe(myProfile as Profile)
    await refresh()
    setLoading(false)
  }

  const refresh = async () => {
    const supabase = createClient()
    const [ps, ss, lg] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('system_settings').select('*').order('key'),
      supabase.from('points_ledger').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    if (ps.data) {
      const list = ps.data as Profile[]
      setProfiles(list)
      const map: Record<string, Profile> = {}
      for (const p of list) map[p.id] = p
      setProfileMap(map)
    }
    if (ss.data) {
      const rows = ss.data as SettingRow[]
      setSettings(rows)
      const draft: Record<string, any> = {}
      for (const r of rows) {
        // Known structured keys → store object directly so the form inputs bind cleanly.
        if (r.key === 'points.signup' || r.key === 'points.paid' || r.key === 'badges.thresholds') {
          draft[r.key] = r.value && typeof r.value === 'object' ? r.value : {}
        } else {
          // Unknown keys → raw JSON string for the textarea fallback.
          draft[r.key] = typeof r.value === 'string' ? r.value : JSON.stringify(r.value, null, 2)
        }
      }
      setSettingsDraft(draft)
    }
    if (lg.data) setLedger(lg.data as LedgerEntry[])
  }

  const changeRole = async (userId: string, newRole: Role) => {
    const supabase = createClient()
    setBusyUserId(userId)
    setStatusMsg(null)
    // Only super_admin can elevate to super_admin
    if (newRole === 'super_admin' && me?.role !== 'super_admin') {
      setStatusMsg(tx.adminOnlySuperCanAssignSuper)
      setBusyUserId(null)
      return
    }
    const { error } = await supabase.from('profiles').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', userId)
    if (error) {
      setStatusMsg(`${tx.adminError}: ${error.message}`)
    } else {
      setStatusMsg(tx.adminRoleUpdated)
      // Optimistic update
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p))
      setProfileMap(prev => prev[userId] ? { ...prev, [userId]: { ...prev[userId], role: newRole } } : prev)
    }
    setBusyUserId(null)
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const markPaid = async (userId: string) => {
    const supabase = createClient()
    setBusyUserId(userId)
    setStatusMsg(null)
    const { error } = await supabase.rpc('mark_user_paid', { target_user_id: userId })
    if (error) {
      setStatusMsg(`${tx.adminError}: ${error.message}`)
    } else {
      setStatusMsg(tx.adminMarkedPaid)
      await refresh()
    }
    setBusyUserId(null)
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const unmarkPaid = async (userId: string) => {
    if (!confirm(tx.adminConfirmUnmarkPaid)) return
    const supabase = createClient()
    setBusyUserId(userId)
    const { error } = await supabase.from('profiles').update({ paid_status: false, paid_at: null }).eq('id', userId)
    if (error) {
      setStatusMsg(`${tx.adminError}: ${error.message}`)
    } else {
      setStatusMsg(tx.adminUnmarkedPaid)
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, paid_status: false, paid_at: null } : p))
    }
    setBusyUserId(null)
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const adjustPoints = async (userId: string) => {
    const input = prompt(tx.adminAdjustPointsPrompt, '0')
    if (!input) return
    const points = parseInt(input, 10)
    if (isNaN(points) || points === 0) return
    const notes = prompt(tx.adminAdjustPointsNote, '') || null
    const supabase = createClient()
    setBusyUserId(userId)
    const { error } = await supabase.from('points_ledger').insert({
      user_id: userId,
      points,
      source: 'manual',
      notes,
    })
    if (error) {
      setStatusMsg(`${tx.adminError}: ${error.message}`)
    } else {
      setStatusMsg(tx.adminPointsAdjusted)
      await refresh()
    }
    setBusyUserId(null)
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const saveSetting = async (key: string) => {
    const supabase = createClient()
    setSavingSettings(true)
    const draft = settingsDraft[key]
    let parsed: any
    if (typeof draft === 'string') {
      try {
        parsed = JSON.parse(draft)
      } catch {
        // Treat as plain string
        parsed = draft
      }
    } else {
      // Already a structured object (points.signup, points.paid, badges.thresholds)
      parsed = draft
    }
    const { error } = await supabase.from('system_settings').update({ value: parsed, updated_at: new Date().toISOString() }).eq('key', key)
    if (error) {
      setStatusMsg(`${tx.adminError}: ${error.message}`)
    } else {
      setSettingsSavedAt(Date.now())
      setStatusMsg(tx.adminSettingSaved)
      await refresh()
    }
    setSavingSettings(false)
    setTimeout(() => setStatusMsg(null), 3000)
  }

  // Update a nested key inside a structured setting (e.g. points.signup.l3 = 5)
  const updateStructuredSetting = (key: string, subKey: string, value: number) => {
    setSettingsDraft(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [subKey]: value },
    }))
  }

  if (loading) return <div style={{ color: '#6a5a40', padding: 40 }}>{tx.loading}</div>

  const accent = '#d4a843'

  if (accessDenied) {
    return (
      <div style={pageBg}>
        <div className="page-pad" style={{ padding: 40, maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h1 style={{ color: accent, fontSize: 22, fontWeight: 'normal', letterSpacing: 1 }}>{tx.adminAccessDenied}</h1>
          <p style={{ color: '#8a7a60', marginTop: 12 }}>{tx.adminAccessDeniedDesc}</p>
          <Link href="/dashboard" style={{ color: accent, textDecoration: 'none', display: 'inline-block', marginTop: 16, padding: '10px 20px', border: `1px solid ${accent}`, borderRadius: 4 }}>
            ← {tx.dashboard}
          </Link>
        </div>
      </div>
    )
  }

  // Filtered users
  const filtered = profiles.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false
    if (paidFilter === 'paid' && !p.paid_status) return false
    if (paidFilter === 'unpaid' && p.paid_status) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const name = (p.display_name || '').toLowerCase()
      const code = (p.referral_code || '').toLowerCase()
      if (!name.includes(q) && !code.includes(q)) return false
    }
    return true
  })

  // Stats
  const counts = {
    total: profiles.length,
    paid: profiles.filter(p => p.paid_status).length,
    admins: profiles.filter(p => p.role === 'admin' || p.role === 'super_admin').length,
    moderators: profiles.filter(p => p.role === 'moderator').length,
    totalPoints: profiles.reduce((s, p) => s + (p.total_points || 0), 0),
  }

  return (
    <div style={pageBg}>
      <div className="app-header" data-header="page" style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, color: accent, fontWeight: 'normal' }}>⚙️ {tx.adminTitle}</h1>
        </div>
        <div style={{ color: '#6a5a40', fontSize: 12 }}>
          {tx.adminSignedInAs} <span style={{ color: '#e8e0d0' }}>{me?.display_name || '—'}</span>
          <span style={{ marginLeft: 8, color: accent, fontSize: 10, padding: '2px 8px', border: `1px solid ${accent}`, borderRadius: 10 }}>
            {me?.role}
          </span>
        </div>
      </div>

      <div className="page-pad" style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>

        {/* Status pill (transient) */}
        {statusMsg && (
          <div style={{
            position: 'fixed', top: 80, right: 32, zIndex: 100,
            background: '#14101a', color: '#e8e0d0', border: `1px solid ${accent}`,
            padding: '10px 18px', borderRadius: 6, fontSize: 13,
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          }}>{statusMsg}</div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <Stat label={tx.adminStatTotal} value={counts.total} accent={accent} />
          <Stat label={tx.adminStatPaid} value={counts.paid} color="#7bc87b" accent={accent} />
          <Stat label={tx.adminStatAdmins} value={counts.admins} accent={accent} />
          <Stat label={tx.adminStatModerators} value={counts.moderators} accent={accent} />
          <Stat label={tx.adminStatTotalPoints} value={counts.totalPoints} color={accent} accent={accent} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(180,140,80,0.2)', marginBottom: 20, flexWrap: 'wrap' }}>
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>👥 {tx.adminTabUsers} ({counts.total})</TabBtn>
          <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')}>⚙️ {tx.adminTabSettings}</TabBtn>
          <TabBtn active={tab === 'ledger'} onClick={() => setTab('ledger')}>📊 {tx.adminTabLedger} ({ledger.length})</TabBtn>
        </div>

        {tab === 'users' && (
          <div>
            {/* Filters */}
            <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder={tx.adminSearchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: '1 1 220px', minWidth: 0 }}
              />
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as any)}>
                <option value="all">{tx.adminFilterAllRoles}</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={paidFilter} onChange={e => setPaidFilter(e.target.value as any)}>
                <option value="all">{tx.adminFilterAllPaid}</option>
                <option value="paid">{tx.adminFilterPaid}</option>
                <option value="unpaid">{tx.adminFilterUnpaid}</option>
              </select>
              <span style={{ color: '#6a5a40', fontSize: 12 }}>
                {filtered.length} / {profiles.length}
              </span>
            </div>

            {/* Users table */}
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 880 }}>
                <thead>
                  <tr style={{ background: 'rgba(180,140,80,0.06)' }}>
                    <Th>{tx.adminColUser}</Th>
                    <Th>{tx.adminColRole}</Th>
                    <Th>{tx.adminColPaid}</Th>
                    <Th>{tx.adminColPoints}</Th>
                    <Th>{tx.adminColReferralCode}</Th>
                    <Th>{tx.adminColReferrer}</Th>
                    <Th>{tx.adminColJoined}</Th>
                    <Th>{tx.adminColActions}</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const referrer = p.referred_by ? profileMap[p.referred_by] : null
                    const busy = busyUserId === p.id
                    const isSelf = me?.id === p.id
                    // super_admin protections
                    const isSuper = p.role === 'super_admin'
                    const canEdit = me?.role === 'super_admin' || (!isSuper && !isSelf)
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(180,140,80,0.08)' }}>
                        <Td>
                          <div style={{ color: '#e8e0d0' }}>{p.display_name || <span style={{ color: '#5a4a30' }}>—</span>}</div>
                          <div style={{ color: '#5a4a30', fontSize: 10, fontFamily: 'monospace' }}>{p.id.slice(0, 8)}…</div>
                        </Td>
                        <Td>
                          <select
                            value={p.role}
                            disabled={!canEdit || busy}
                            onChange={e => changeRole(p.id, e.target.value as Role)}
                            style={{ padding: '4px 8px', fontSize: 12 }}
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r} disabled={r === 'super_admin' && me?.role !== 'super_admin'}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </Td>
                        <Td>
                          {p.paid_status ? (
                            <span style={pillStyle('#7bc87b')}>✓ {tx.adminPaid}</span>
                          ) : (
                            <span style={pillStyle('#8a7a60')}>—</span>
                          )}
                        </Td>
                        <Td>
                          <span style={{ color: accent, fontWeight: 600 }}>{p.total_points.toLocaleString()}</span>
                        </Td>
                        <Td>
                          <code style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 3, color: accent, fontSize: 11 }}>
                            {p.referral_code}
                          </code>
                        </Td>
                        <Td>
                          {referrer ? (
                            <span style={{ color: '#a09080', fontSize: 12 }}>{referrer.display_name || referrer.referral_code}</span>
                          ) : (
                            <span style={{ color: '#5a4a30' }}>—</span>
                          )}
                        </Td>
                        <Td>
                          <span style={{ color: '#6a5a40', fontSize: 11 }}>
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </Td>
                        <Td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {!p.paid_status ? (
                              <button
                                disabled={busy}
                                onClick={() => markPaid(p.id)}
                                style={smallBtn('#7bc87b')}
                                title={tx.adminBtnMarkPaidTip}
                              >
                                💳 {tx.adminBtnMarkPaid}
                              </button>
                            ) : (
                              <button
                                disabled={busy}
                                onClick={() => unmarkPaid(p.id)}
                                style={smallBtn('#c05050')}
                                title={tx.adminBtnUnmarkPaidTip}
                              >
                                ✕ {tx.adminBtnUnmarkPaid}
                              </button>
                            )}
                            <button
                              disabled={busy}
                              onClick={() => adjustPoints(p.id)}
                              style={smallBtn(accent)}
                              title={tx.adminBtnAdjustPointsTip}
                            >
                              ± {tx.adminBtnAdjustPoints}
                            </button>
                          </div>
                        </Td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6a5a40' }}>
                        {tx.adminNoUsers}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div>
            <p style={{ color: '#8a7a60', fontSize: 13, marginTop: 0 }}>{tx.adminSettingsDesc}</p>
            {settings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 30, color: '#6a5a40' }}>{tx.adminNoSettings}</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Friendly editors for known structured keys */}
                {settings.filter(s => s.key === 'points.signup' || s.key === 'points.paid').map(s => {
                  const isSignup = s.key === 'points.signup'
                  const draft = (settingsDraft[s.key] as Record<string, number>) || {}
                  const total = [1, 2, 3, 4, 5].reduce((sum, lvl) => sum + (Number(draft['l' + lvl]) || 0), 0)
                  const icon = isSignup ? '👋' : '💳'
                  const titleKey = isSignup ? tx.adminSettingsSignupTitle : tx.adminSettingsPaidTitle
                  const descKey = isSignup ? tx.adminSettingsSignupDesc : tx.adminSettingsPaidDesc
                  return (
                    <div key={s.key} className="card">
                      <div style={settingsHeaderRow}>
                        <div>
                          <h3 style={settingsTitle}>{icon} {titleKey}</h3>
                          <p style={settingsSubtitle}>{descKey}</p>
                          <code style={{ color: '#5a4a30', fontSize: 10, fontFamily: 'monospace' }}>{s.key}</code>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.adminSettingsTotalPerEvent}</div>
                          <div style={{ color: accent, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{total}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
                        {[1, 2, 3, 4, 5].map(lvl => {
                          const levelColor = ['#d4a843', '#c0a043', '#a08840', '#806c33', '#605025'][lvl - 1]
                          return (
                            <div key={lvl} style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: `1px solid ${levelColor}33`,
                              borderRadius: 6,
                              padding: 10,
                            }}>
                              <div style={{ color: levelColor, fontSize: 11, letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>
                                {tx.referralsLevel} {lvl}
                                <span style={{ color: '#5a4a30', fontWeight: 400, marginLeft: 6 }}>
                                  · {lvl === 1 ? tx.referralsLevelDirect : tx.referralsLevelIndirect}
                                </span>
                              </div>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={Number(draft['l' + lvl]) || 0}
                                onChange={e => updateStructuredSetting(s.key, 'l' + lvl, Math.max(0, parseInt(e.target.value || '0', 10)))}
                                style={{ width: '100%', textAlign: 'center', fontSize: 18, fontWeight: 600, color: accent, padding: '6px 4px' }}
                              />
                              <div style={{ color: '#5a4a30', fontSize: 10, marginTop: 4, textAlign: 'center' }}>
                                {tx.adminSettingsPointsUnit}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button
                          className="btn-gold"
                          onClick={() => saveSetting(s.key)}
                          disabled={savingSettings}
                          style={{ padding: '8px 20px', fontSize: 13 }}
                        >
                          💾 {tx.adminSaveSetting}
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Badge thresholds editor */}
                {settings.filter(s => s.key === 'badges.thresholds').map(s => {
                  const draft = (settingsDraft[s.key] as Record<string, number>) || {}
                  const tiers: Array<{ key: string; label: string; color: string; emoji: string }> = [
                    { key: 'bronze',   label: tx.badgeTierBronze,   color: '#c47b3e', emoji: '🥉' },
                    { key: 'silver',   label: tx.badgeTierSilver,   color: '#b8b8b8', emoji: '🥈' },
                    { key: 'gold',     label: tx.badgeTierGold,     color: '#d4a843', emoji: '🥇' },
                    { key: 'platinum', label: tx.badgeTierPlatinum, color: '#9ad0d4', emoji: '💎' },
                  ]
                  return (
                    <div key={s.key} className="card">
                      <div style={settingsHeaderRow}>
                        <div>
                          <h3 style={settingsTitle}>🏆 {tx.adminSettingsBadgesTitle}</h3>
                          <p style={settingsSubtitle}>{tx.adminSettingsBadgesDesc}</p>
                          <code style={{ color: '#5a4a30', fontSize: 10, fontFamily: 'monospace' }}>{s.key}</code>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 14 }}>
                        {tiers.map(t => (
                          <div key={t.key} style={{
                            background: `${t.color}11`,
                            border: `1px solid ${t.color}44`,
                            borderRadius: 6,
                            padding: 12,
                          }}>
                            <div style={{ color: t.color, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                              {t.emoji} {t.label}
                            </div>
                            <input
                              type="number"
                              min={0}
                              step={50}
                              value={Number(draft[t.key]) || 0}
                              onChange={e => updateStructuredSetting(s.key, t.key, Math.max(0, parseInt(e.target.value || '0', 10)))}
                              style={{ width: '100%', textAlign: 'center', fontSize: 18, fontWeight: 600, color: t.color, padding: '6px 4px' }}
                            />
                            <div style={{ color: '#5a4a30', fontSize: 10, marginTop: 4, textAlign: 'center' }}>
                              {tx.adminSettingsPointsRequired}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button
                          className="btn-gold"
                          onClick={() => saveSetting(s.key)}
                          disabled={savingSettings}
                          style={{ padding: '8px 20px', fontSize: 13 }}
                        >
                          💾 {tx.adminSaveSetting}
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* JSON fallback for any other unknown keys */}
                {settings.filter(s =>
                  s.key !== 'points.signup' && s.key !== 'points.paid' && s.key !== 'badges.thresholds'
                ).map(s => (
                  <div key={s.key} className="card">
                    <div style={settingsHeaderRow}>
                      <div>
                        <code style={{ color: accent, fontFamily: 'monospace', fontSize: 13 }}>{s.key}</code>
                        {s.description && (
                          <div style={{ color: '#6a5a40', fontSize: 11, marginTop: 4 }}>{s.description}</div>
                        )}
                      </div>
                      <button
                        className="btn-gold"
                        onClick={() => saveSetting(s.key)}
                        disabled={savingSettings}
                        style={{ padding: '6px 16px', fontSize: 12 }}
                      >
                        💾 {tx.adminSaveSetting}
                      </button>
                    </div>
                    <textarea
                      value={typeof settingsDraft[s.key] === 'string' ? settingsDraft[s.key] : JSON.stringify(settingsDraft[s.key] || {}, null, 2)}
                      onChange={e => setSettingsDraft({ ...settingsDraft, [s.key]: e.target.value })}
                      rows={6}
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 10, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

              </div>
            )}
          </div>
        )}

        {tab === 'ledger' && (
          <div>
            <p style={{ color: '#8a7a60', fontSize: 13, marginTop: 0 }}>{tx.adminLedgerDesc}</p>
            <div className="card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 760 }}>
                <thead>
                  <tr style={{ background: 'rgba(180,140,80,0.06)' }}>
                    <Th>{tx.adminColUser}</Th>
                    <Th>{tx.adminColSource}</Th>
                    <Th>{tx.adminColRelated}</Th>
                    <Th>{tx.adminColPointsDelta}</Th>
                    <Th>{tx.adminColNotes}</Th>
                    <Th>{tx.adminColDate}</Th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(l => {
                    const user = profileMap[l.user_id]
                    const related = l.related_user_id ? profileMap[l.related_user_id] : null
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid rgba(180,140,80,0.06)' }}>
                        <Td>{user?.display_name || <code style={{ color: '#5a4a30', fontSize: 10 }}>{l.user_id.slice(0, 8)}…</code>}</Td>
                        <Td><span style={{ color: '#a09080' }}>{l.source}</span></Td>
                        <Td>{related ? related.display_name || related.referral_code : <span style={{ color: '#5a4a30' }}>—</span>}</Td>
                        <Td>
                          <span style={{ color: l.points >= 0 ? '#7bc87b' : '#c05050', fontWeight: 600 }}>
                            {l.points >= 0 ? '+' : ''}{l.points}
                          </span>
                        </Td>
                        <Td><span style={{ color: '#8a7a60', fontSize: 11 }}>{l.notes || ''}</span></Td>
                        <Td>
                          <span style={{ color: '#6a5a40', fontSize: 11 }}>
                            {new Date(l.created_at).toLocaleString()}
                          </span>
                        </Td>
                      </tr>
                    )
                  })}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6a5a40' }}>
                        {tx.adminNoLedger}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

/* ---------- small presentational helpers ---------- */

const pageBg: React.CSSProperties = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)',
  color: '#e8e0d0',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}

const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(180,140,80,0.2)',
  padding: '20px 32px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
}

function Stat({ label, value, color, accent }: { label: string; value: number; color?: string; accent: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#e8e0d0', lineHeight: 1 }}>{value.toLocaleString()}</div>
      <div style={{ color: '#6a5a40', fontSize: 10, letterSpacing: 1, marginTop: 6, textTransform: 'uppercase' }}>{label}</div>
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
        letterSpacing: 0.5,
        transition: 'color 0.2s, border-color 0.2s',
      }}
    >
      {children}
    </button>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '10px 12px', color: '#8a7a60', fontWeight: 'normal', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>{children}</td>
}

function pillStyle(color: string): React.CSSProperties {
  return {
    color,
    fontSize: 10,
    padding: '2px 8px',
    border: `1px solid ${color}55`,
    borderRadius: 10,
    background: `${color}11`,
    display: 'inline-block',
    whiteSpace: 'nowrap',
  }
}

const settingsHeaderRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap',
}

const settingsTitle: React.CSSProperties = {
  margin: 0,
  color: '#d4a843',
  fontSize: 15,
  fontWeight: 'normal',
  letterSpacing: 0.5,
}

const settingsSubtitle: React.CSSProperties = {
  margin: '4px 0 4px',
  color: '#8a7a60',
  fontSize: 12,
  maxWidth: 520,
}

function smallBtn(color: string): React.CSSProperties {
  return {
    background: 'transparent',
    border: `1px solid ${color}66`,
    color,
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}
