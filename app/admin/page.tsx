'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { t, useLang, type Lang } from '@/lib/i18n'
import Avatar from '@/components/Avatar'

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
  avatar_url?: string | null
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

type Tab = 'users' | 'settings' | 'ledger' | 'moderation'

type MessageReport = {
  id: string
  message_id: string
  reporter_id: string
  reason: string
  status: 'pending' | 'dismissed' | 'actioned'
  created_at: string
  message?: { id: string; content: string; sender_id: string; conversation_id: string; hidden: boolean; created_at: string }
  reporter?: { display_name: string | null; referral_code: string }
  sender?: { display_name: string | null; referral_code: string }
}

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
  const [reports, setReports] = useState<MessageReport[]>([])

  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // Transfer-referrer modal
  const [transferTarget, setTransferTarget] = useState<Profile | null>(null)
  const [transferSearch, setTransferSearch] = useState('')
  const [transferBusy, setTransferBusy] = useState(false)

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
        if (r.key === 'points.signup' || r.key === 'points.paid' || r.key === 'badges.thresholds' || r.key === 'points.listen') {
          draft[r.key] = r.value && typeof r.value === 'object' ? r.value : {}
        } else if (r.key === 'points.listen_daily_cap') {
          // Numeric scalar key
          draft[r.key] = Number(r.value) || 0
        } else {
          // Unknown keys → raw JSON string for the textarea fallback.
          draft[r.key] = typeof r.value === 'string' ? r.value : JSON.stringify(r.value, null, 2)
        }
      }
      setSettingsDraft(draft)
    }
    if (lg.data) setLedger(lg.data as LedgerEntry[])

    // Load pending message reports for moderation queue
    try {
      const { data: reportsData } = await supabase
        .from('message_reports')
        .select('id, message_id, reporter_id, reason, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50)
      if (reportsData && reportsData.length > 0) {
        const msgIds = (reportsData as any[]).map(r => r.message_id)
        const reporterIds = Array.from(new Set((reportsData as any[]).map(r => r.reporter_id)))
        const [msgsRes, reportersRes] = await Promise.all([
          supabase.from('messages').select('id, content, sender_id, conversation_id, hidden, created_at').in('id', msgIds),
          supabase.from('profiles').select('id, display_name, referral_code').in('id', reporterIds),
        ])
        const msgMap: Record<string, any> = {}
        const reporterMap: Record<string, any> = {}
        for (const m of (msgsRes.data as any[]) || []) msgMap[m.id] = m
        for (const p of (reportersRes.data as any[]) || []) reporterMap[p.id] = p
        const senderIds = Array.from(new Set(Object.values(msgMap).map((m: any) => m.sender_id)))
        const { data: senders } = await supabase.from('profiles').select('id, display_name, referral_code').in('id', senderIds)
        const senderMap: Record<string, any> = {}
        for (const p of (senders as any[]) || []) senderMap[p.id] = p

        setReports((reportsData as any[]).map(r => ({
          ...r,
          message: msgMap[r.message_id],
          reporter: reporterMap[r.reporter_id],
          sender: msgMap[r.message_id] ? senderMap[msgMap[r.message_id].sender_id] : undefined,
        })))
      } else {
        setReports([])
      }
    } catch {}
  }

  const moderateReport = async (reportId: string, messageId: string, action: 'dismiss' | 'hide') => {
    const supabase = createClient()
    setBusyUserId(reportId)
    if (action === 'hide') {
      const { error: hideErr } = await supabase.from('messages').update({ hidden: true }).eq('id', messageId)
      if (hideErr) { setStatusMsg(`${tx.adminError}: ${hideErr.message}`); setBusyUserId(null); return }
    }
    const { error } = await supabase
      .from('message_reports')
      .update({ status: action === 'hide' ? 'actioned' : 'dismissed', reviewed_by: me?.id, reviewed_at: new Date().toISOString() })
      .eq('id', reportId)
    setBusyUserId(null)
    if (error) { setStatusMsg(`${tx.adminError}: ${error.message}`); return }
    setStatusMsg(action === 'hide' ? tx.adminModHidden : tx.adminModDismissed)
    await refresh()
    setTimeout(() => setStatusMsg(null), 3000)
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

  const performTransferReferrer = async (newReferrerId: string | null) => {
    if (!transferTarget) return
    setTransferBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('transfer_referrer', {
      target_user_id: transferTarget.id,
      new_referrer_id: newReferrerId,
    })
    setTransferBusy(false)
    if (error) {
      setStatusMsg(`${tx.adminError}: ${error.message}`)
    } else if (data && (data as any).error) {
      const errKey = (data as any).error as string
      const map: Record<string, string> = {
        not_authorised:     tx.adminTransferErrNotAuth,
        target_not_found:   tx.adminTransferErrTargetMissing,
        referrer_not_found: tx.adminTransferErrReferrerMissing,
        self_referral:      tx.adminTransferErrSelf,
        would_create_cycle: tx.adminTransferErrCycle,
      }
      setStatusMsg(`${tx.adminError}: ${map[errKey] || errKey}`)
    } else {
      setStatusMsg(tx.adminTransferSuccess)
      setTransferTarget(null)
      setTransferSearch('')
      await refresh()
    }
    setTimeout(() => setStatusMsg(null), 4000)
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
        <Link href="/profile" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px 6px 6px',
          border: '1px solid rgba(180,140,80,0.25)',
          borderRadius: 24,
          background: 'rgba(255,255,255,0.02)',
          textDecoration: 'none',
        }} title={tx.profileTitle}>
          <Avatar value={me?.avatar_url} name={me?.display_name} seed={me?.id} size={28} />
          <span style={{ color: '#e8e0d0', fontSize: 13, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me?.display_name || tx.profileGuest}
          </span>
          <span style={{ color: accent, fontSize: 10, padding: '2px 8px', border: `1px solid ${accent}`, borderRadius: 10 }}>
            {me?.role}
          </span>
        </Link>
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
          <TabBtn active={tab === 'moderation'} onClick={() => setTab('moderation')}>
            ⚐ {tx.adminTabModeration}
            {reports.length > 0 && (
              <span style={{ marginLeft: 6, background: '#c05050', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8 }}>{reports.length}</span>
            )}
          </TabBtn>
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
                            <button
                              disabled={busy}
                              onClick={() => { setTransferTarget(p); setTransferSearch('') }}
                              style={smallBtn('#9ad0d4')}
                              title={tx.adminBtnTransferReferrerTip}
                            >
                              🔀 {tx.adminBtnTransferReferrer}
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

                {/* Listen points editor */}
                {settings.filter(s => s.key === 'points.listen').map(s => {
                  const draft = (settingsDraft[s.key] as Record<string, number>) || {}
                  const items: Array<{ key: string; label: string; emoji: string; hint: string; step: number }> = [
                    { key: 'full_play',    label: tx.adminListenFullLabel,    emoji: '🎵', hint: tx.adminListenFullHint,    step: 1 },
                    { key: 'partial_play', label: tx.adminListenPartialLabel, emoji: '⏯️', hint: tx.adminListenPartialHint, step: 1 },
                    { key: 'embed_click',  label: tx.adminListenEmbedLabel,   emoji: '🔗', hint: tx.adminListenEmbedHint,   step: 1 },
                  ]
                  return (
                    <div key={s.key} className="card">
                      <div style={settingsHeaderRow}>
                        <div>
                          <h3 style={settingsTitle}>🎧 {tx.adminListenTitle}</h3>
                          <p style={settingsSubtitle}>{tx.adminListenDesc}</p>
                          <code style={{ color: '#5a4a30', fontSize: 10, fontFamily: 'monospace' }}>{s.key}</code>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 14 }}>
                        {items.map(it => (
                          <div key={it.key} style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(212,168,67,0.2)',
                            borderRadius: 6,
                            padding: 12,
                          }}>
                            <div style={{ color: accent, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{it.emoji} {it.label}</div>
                            <input
                              type="number"
                              min={0}
                              step={it.step}
                              value={Number(draft[it.key]) || 0}
                              onChange={e => updateStructuredSetting(s.key, it.key, Math.max(0, parseInt(e.target.value || '0', 10)))}
                              style={{ width: '100%', textAlign: 'center', fontSize: 18, fontWeight: 600, color: accent, padding: '6px 4px' }}
                            />
                            <div style={{ color: '#6a5a40', fontSize: 10, marginTop: 6 }}>{it.hint}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button className="btn-gold" onClick={() => saveSetting(s.key)} disabled={savingSettings} style={{ padding: '8px 20px', fontSize: 13 }}>
                          💾 {tx.adminSaveSetting}
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Daily cap editor (scalar number) */}
                {settings.filter(s => s.key === 'points.listen_daily_cap').map(s => (
                  <div key={s.key} className="card">
                    <div style={settingsHeaderRow}>
                      <div>
                        <h3 style={settingsTitle}>🚦 {tx.adminListenCapTitle}</h3>
                        <p style={settingsSubtitle}>{tx.adminListenCapDesc}</p>
                        <code style={{ color: '#5a4a30', fontSize: 10, fontFamily: 'monospace' }}>{s.key}</code>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        value={Number(settingsDraft[s.key]) || 0}
                        onChange={e => setSettingsDraft({ ...settingsDraft, [s.key]: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                        style={{ width: 140, textAlign: 'center', fontSize: 22, fontWeight: 700, color: accent, padding: '8px 4px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                      <button className="btn-gold" onClick={() => saveSetting(s.key)} disabled={savingSettings} style={{ padding: '8px 20px', fontSize: 13 }}>
                        💾 {tx.adminSaveSetting}
                      </button>
                    </div>
                  </div>
                ))}

                {/* JSON fallback for any other unknown keys */}
                {settings.filter(s =>
                  s.key !== 'points.signup' &&
                  s.key !== 'points.paid' &&
                  s.key !== 'badges.thresholds' &&
                  s.key !== 'points.listen' &&
                  s.key !== 'points.listen_daily_cap'
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

        {tab === 'moderation' && (
          <div>
            <p style={{ color: '#8a7a60', fontSize: 13, marginTop: 0 }}>{tx.adminModerationDesc}</p>
            {reports.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🕊️</div>
                <p style={{ color: '#8a7a60' }}>{tx.adminModerationEmpty}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reports.map(r => (
                  <div key={r.id} className="card" style={{ borderColor: 'rgba(192,80,80,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, color: '#8a7a60' }}>
                        <strong style={{ color: '#c05050' }}>⚐ {tx.adminModerationReportedBy}:</strong>{' '}
                        {r.reporter?.display_name || r.reporter?.referral_code || '—'} · {new Date(r.created_at).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: '#5a4a30' }}>{tx.adminModerationReason}: {r.reason}</div>
                    </div>
                    {r.message ? (
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(180,140,80,0.15)',
                        borderRadius: 6,
                        padding: 12,
                        marginBottom: 12,
                      }}>
                        <div style={{ color: '#6a5a40', fontSize: 11, marginBottom: 4 }}>
                          {tx.adminModerationFrom}: {r.sender?.display_name || r.sender?.referral_code || r.message.sender_id.slice(0, 8)}
                          {r.message.hidden && <span style={{ marginLeft: 8, color: '#c05050' }}>({tx.adminModerationAlreadyHidden})</span>}
                        </div>
                        <div style={{ color: '#e8e0d0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{r.message.content}</div>
                      </div>
                    ) : (
                      <div style={{ color: '#5a4a30', fontSize: 12, marginBottom: 12 }}>{tx.adminModerationMessageGone}</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        onClick={() => moderateReport(r.id, r.message_id, 'dismiss')}
                        disabled={busyUserId === r.id}
                        style={smallBtn('#8a7a60')}
                      >
                        ✓ {tx.adminModerationDismiss}
                      </button>
                      <button
                        onClick={() => moderateReport(r.id, r.message_id, 'hide')}
                        disabled={busyUserId === r.id || r.message?.hidden}
                        style={smallBtn('#c05050')}
                      >
                        🚫 {tx.adminModerationHide}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transfer-referrer modal */}
        {transferTarget && (() => {
          const currentReferrer = transferTarget.referred_by ? profileMap[transferTarget.referred_by] : null
          const search = transferSearch.trim().toLowerCase()
          // Candidates = all other profiles, optionally filtered by search
          const candidates = profiles.filter(p => {
            if (p.id === transferTarget.id) return false
            if (!search) return true
            const hay = `${p.display_name || ''} ${p.referral_code || ''}`.toLowerCase()
            return hay.includes(search)
          }).slice(0, 30)

          return (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', borderColor: 'rgba(154,208,212,0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#9ad0d4', fontWeight: 'normal', fontSize: 18 }}>
                      🔀 {tx.adminTransferTitle}
                    </h3>
                    <p style={{ color: '#8a7a60', fontSize: 13, margin: '6px 0 0' }}>
                      {tx.adminTransferDesc}
                    </p>
                  </div>
                  <button
                    onClick={() => { setTransferTarget(null); setTransferSearch('') }}
                    style={{ background: 'none', border: 'none', color: '#6a5a40', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}
                    title={tx.close}
                  >×</button>
                </div>

                {/* Target user */}
                <div style={{
                  background: 'rgba(154,208,212,0.06)',
                  border: '1px solid rgba(154,208,212,0.25)',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 14,
                }}>
                  <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
                    {tx.adminTransferTargetLabel}
                  </div>
                  <div style={{ color: '#e8e0d0', fontSize: 16, fontWeight: 600, marginTop: 4 }}>
                    {transferTarget.display_name || transferTarget.referral_code}
                  </div>
                  <div style={{ color: '#8a7a60', fontSize: 12, marginTop: 2 }}>
                    <code style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 3, color: accent }}>{transferTarget.referral_code}</code>
                  </div>
                </div>

                {/* Current referrer */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                    {tx.adminTransferCurrent}
                  </div>
                  {currentReferrer ? (
                    <div style={{ color: '#a09080', fontSize: 13 }}>
                      {currentReferrer.display_name || currentReferrer.referral_code}{' '}
                      <code style={{ color: '#6a5a40', fontSize: 11 }}>({currentReferrer.referral_code})</code>
                    </div>
                  ) : (
                    <div style={{ color: '#5a4a30', fontSize: 13, fontStyle: 'italic' }}>
                      {tx.adminTransferNoneCurrent}
                    </div>
                  )}
                </div>

                {/* New referrer search */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: '#6a5a40', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                    {tx.adminTransferNew}
                  </div>
                  <input
                    value={transferSearch}
                    onChange={e => setTransferSearch(e.target.value)}
                    placeholder={tx.adminTransferSearchPlaceholder}
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: 14 }}
                    autoFocus
                  />
                </div>

                {/* Quick option: remove referrer */}
                <button
                  disabled={transferBusy || !currentReferrer}
                  onClick={() => {
                    if (confirm(tx.adminTransferConfirmRemove)) performTransferReferrer(null)
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: '1px dashed rgba(192,80,80,0.4)',
                    color: '#c05050',
                    borderRadius: 6,
                    cursor: currentReferrer ? 'pointer' : 'not-allowed',
                    opacity: currentReferrer ? 1 : 0.4,
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  ✕ {tx.adminTransferRemoveReferrer}
                </button>

                {/* Candidates list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                  {candidates.map(c => {
                    const isCurrent = c.id === transferTarget.referred_by
                    return (
                      <button
                        key={c.id}
                        disabled={transferBusy || isCurrent}
                        onClick={() => {
                          if (confirm(tx.adminTransferConfirm.replace('{name}', c.display_name || c.referral_code))) {
                            performTransferReferrer(c.id)
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '8px 12px',
                          background: isCurrent ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)',
                          border: '1px solid ' + (isCurrent ? 'rgba(212,168,67,0.3)' : 'rgba(180,140,80,0.15)'),
                          borderRadius: 4,
                          color: '#e8e0d0',
                          cursor: isCurrent ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          fontSize: 13,
                          opacity: isCurrent ? 0.6 : 1,
                        }}
                      >
                        <span>
                          {c.display_name || <code style={{ color: '#5a4a30' }}>{c.referral_code}</code>}
                        </span>
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <code style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 3, color: '#a09080', fontSize: 10 }}>{c.referral_code}</code>
                          {isCurrent && <span style={{ color: accent, fontSize: 11 }}>({tx.adminTransferCurrentTag})</span>}
                        </span>
                      </button>
                    )
                  })}
                  {candidates.length === 0 && (
                    <div style={{ color: '#6a5a40', textAlign: 'center', padding: 20, fontSize: 13 }}>
                      {tx.adminTransferNoMatches}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

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
