'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang, type Lang } from '@/lib/i18n'
import AdminSystemHealthPanel from '@/components/admin/AdminSystemHealthPanel'

const labels = {
  no: {
    title: 'SaaS kontrollsenter',
    desc: 'Intern oversikt for drift, abonnement, AI, fanvekst og moderering.',
    refresh: 'Oppdater',
    loading: 'Laster kontrollsenter...',
    users: 'Brukere',
    ai: 'AI-bruk',
    settings: 'Feature flags',
    billing: 'Abonnement',
    newsletter: 'Nyhetsbrev',
    moderation: 'Moderering',
    feedback: 'Feedback',
    sanity: 'Sanity',
    audit: 'Audit logg',
    totalUsers: 'Totale brukere',
    active7: 'Aktive 7d',
    active30: 'Aktive 30d',
    pro: 'Pro-abonnenter',
    mrr: 'MRR estimat',
    aiMonth: 'AI-genereringer',
    pageViews: 'Off. sidevisninger',
    subscribers: 'Subscribers',
    embeds: 'Embeds',
    songsPublished: 'Publiserte låter',
    searchUsers: 'Søk bruker, kode eller id...',
    plan: 'Plan',
    usage: 'Bruk',
    adminNotes: 'Adminnotater',
    overrides: 'Feature overrides JSON',
    disable: 'Deaktiver',
    enable: 'Aktiver',
    freePlan: 'Free',
    proStripe: 'Pro via Stripe',
    proManual: 'Pro manual',
    grantManualPro: 'Gi manual Pro',
    removeManualPro: 'Fjern manual Pro',
    manualProExpiry: 'Utløp (valgfritt)',
    manualProReason: 'Årsak / beta-note',
    save: 'Lagre',
    refreshSub: 'Recheck',
    providerModel: 'Provider / model',
    estimatedCost: 'Estimert AI-kost',
    failedCalls: 'Feilede kall',
    topUsers: 'Toppbrukere',
    monthlyTrends: 'Månedstrender',
    stripeReady: 'Stripe konfigurert',
    stripeMissing: 'Stripe mangler env vars',
    webhookLogs: 'Webhook / subscription events',
    sourceAnalytics: 'Signup-kilder',
    topFanArtists: 'Toppartister fanvekst',
    reportedPlaceholder: 'Rapportert innhold kommer her. Meldingsrapporter finnes fortsatt i Moderering-fanen.',
    hiddenArtists: 'Skjulte artistsider',
    hiddenSongs: 'Skjulte låtsider',
    hideArtist: 'Skjul artist',
    hideSong: 'Skjul låt',
    noData: 'Ingen data ennå.',
    updated: 'Oppdatert.',
    error: 'Kunne ikke utføre handlingen.',
    loadError: 'Kunne ikke laste kontrollsenteret.',
    feedbackInbox: 'Feedback inbox',
    feedbackEmpty: 'Ingen feedback ennå.',
    markReviewed: 'Marker lest',
    markResolved: 'Løst',
    markDismissed: 'Avvis',
    sanityTitle: 'Beta sanity checks',
    sanityDesc: 'Rask sjekk av miljøvariabler og integrasjoner før beta-testing.',
    ok: 'OK',
    missing: 'Mangler',
    system: 'System / Beta',
    adminBetaReadinessTitle: 'Beta-klarhetssjekk',
    adminBetaReadinessDesc: 'Miljø, migrasjoner og integrasjoner før kontrollert beta.',
    adminBetaReady: 'Klar',
    adminBetaMissing: 'mangler',
    adminMigrationHealthTitle: 'Migrasjonshelse',
    adminMigrationMissing: 'Manglende tabeller',
    adminMigrationTable: 'Tabell',
    adminMigrationStatus: 'Status',
    adminMigrationHint: 'Migrasjon',
    adminOk: 'OK',
    adminVisibilityAuditTitle: 'Offentlig synlighet',
    adminVisibilityAuditDesc: 'Skjult innhold skal ikke vises på discover, offentlige sider eller sitemap.',
    adminPlanGatingTitle: 'Plan-gating',
    adminSafetyWarningsTitle: 'Advarsler',
    adminFailedApiWarnings: 'Nylige feilede AI/API-kall',
    adminRecentActions: 'Nylige admin-handlinger',
    adminSystemNoData: 'Ingen systemdata.',
    adminHiddenEpks: 'EPK ikke publisert',
    adminRlsDoc: 'Se docs/RLS_TEST_CHECKLIST.md',
  },
  en: {
    title: 'SaaS Control Center',
    desc: 'Internal operating view for users, subscriptions, AI, fan growth, and moderation.',
    refresh: 'Refresh',
    loading: 'Loading control center...',
    users: 'Users',
    ai: 'AI usage',
    settings: 'Feature flags',
    billing: 'Subscriptions',
    newsletter: 'Newsletter',
    moderation: 'Moderation',
    feedback: 'Feedback',
    sanity: 'Sanity',
    audit: 'Audit log',
    totalUsers: 'Total users',
    active7: 'Active 7d',
    active30: 'Active 30d',
    pro: 'Pro subscribers',
    mrr: 'MRR estimate',
    aiMonth: 'AI generations',
    pageViews: 'Public page views',
    subscribers: 'Subscribers',
    embeds: 'Embeds',
    songsPublished: 'Songs published',
    searchUsers: 'Search user, code, or id...',
    plan: 'Plan',
    usage: 'Usage',
    adminNotes: 'Admin notes',
    overrides: 'Feature overrides JSON',
    disable: 'Disable',
    enable: 'Enable',
    freePlan: 'Free',
    proStripe: 'Pro via Stripe',
    proManual: 'Pro manual',
    grantManualPro: 'Grant manual Pro',
    removeManualPro: 'Remove manual Pro',
    manualProExpiry: 'Expiry (optional)',
    manualProReason: 'Reason / beta note',
    save: 'Save',
    refreshSub: 'Recheck',
    providerModel: 'Provider / model',
    estimatedCost: 'Estimated AI cost',
    failedCalls: 'Failed calls',
    topUsers: 'Top users',
    monthlyTrends: 'Monthly trends',
    stripeReady: 'Stripe configured',
    stripeMissing: 'Stripe env vars missing',
    webhookLogs: 'Webhook / subscription events',
    sourceAnalytics: 'Signup sources',
    topFanArtists: 'Top fan-growth artists',
    reportedPlaceholder: 'Reported content placeholder. Message reports still live in the Moderation tab.',
    hiddenArtists: 'Hidden artist pages',
    hiddenSongs: 'Hidden song pages',
    hideArtist: 'Hide artist',
    hideSong: 'Hide song',
    noData: 'No data yet.',
    updated: 'Updated.',
    error: 'Could not perform action.',
    loadError: 'Could not load control center.',
    feedbackInbox: 'Feedback inbox',
    feedbackEmpty: 'No feedback yet.',
    markReviewed: 'Mark reviewed',
    markResolved: 'Resolved',
    markDismissed: 'Dismiss',
    sanityTitle: 'Beta sanity checks',
    sanityDesc: 'Quick check of environment variables and integrations before beta testing.',
    ok: 'OK',
    missing: 'Missing',
    system: 'System / Beta',
    adminBetaReadinessTitle: 'Beta readiness checklist',
    adminBetaReadinessDesc: 'Environment, migrations, and integrations before controlled beta.',
    adminBetaReady: 'Ready',
    adminBetaMissing: 'missing',
    adminMigrationHealthTitle: 'Migration health',
    adminMigrationMissing: 'Missing tables',
    adminMigrationTable: 'Table',
    adminMigrationStatus: 'Status',
    adminMigrationHint: 'Migration',
    adminOk: 'OK',
    adminVisibilityAuditTitle: 'Public visibility audit',
    adminVisibilityAuditDesc: 'Hidden content must not appear on discover, public pages, or sitemap.',
    adminPlanGatingTitle: 'Plan gating audit',
    adminSafetyWarningsTitle: 'Warnings',
    adminFailedApiWarnings: 'Recent failed AI/API calls',
    adminRecentActions: 'Recent admin actions',
    adminSystemNoData: 'No system data loaded.',
    adminHiddenEpks: 'EPK not published',
    adminRlsDoc: 'See docs/RLS_TEST_CHECKLIST.md',
  },
}

type Section = 'users' | 'ai' | 'settings' | 'billing' | 'newsletter' | 'moderation' | 'feedback' | 'sanity' | 'system' | 'audit'

export default function AdminControlCenter() {
  const [lang, setLang] = useState<Lang>('en')
  const tx = labels[lang]
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [section, setSection] = useState<Section>('users')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState('')
  const [drafts, setDrafts] = useState<Record<string, any>>({})

  useEffect(() => {
    setLang(useLang())
    load()
  }, [])

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/admin/control-center', { headers })
      const text = await res.text()
      const next = text ? JSON.parse(text) : null
      if (!res.ok) throw new Error(next?.error || `${tx.loadError} (${res.status})`)
      if (!next?.overview) throw new Error(tx.loadError)
      setData(next)
      const nextDrafts: Record<string, any> = {}
      for (const s of next.settings || []) nextDrafts[`setting:${s.key}`] = JSON.stringify(s.value || {}, null, 2)
      for (const u of next.users || []) {
        nextDrafts[`notes:${u.id}`] = u.admin_notes || ''
        nextDrafts[`overrides:${u.id}`] = JSON.stringify(u.feature_overrides || {}, null, 2)
        nextDrafts[`manual_expiry:${u.id}`] = u.manual_plan_override?.expires_at ? String(u.manual_plan_override.expires_at).slice(0, 10) : ''
        nextDrafts[`manual_reason:${u.id}`] = u.manual_plan_override?.reason || ''
      }
      setDrafts(nextDrafts)
    } catch (e: any) {
      if (process.env.NODE_ENV !== 'production') console.error('[AdminControlCenter] load failed', e)
      setLoadError(e?.message || tx.loadError)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const postAction = async (body: Record<string, any>) => {
    setBusy(`${body.action}:${body.user_id || body.key || body.artist_id || body.song_id || ''}`)
    setStatus('')
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/admin/control-center', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      const next = text ? JSON.parse(text) : null
      if (!res.ok) throw new Error(next?.error || 'failed')
      setStatus(tx.updated)
      await load()
    } catch {
      setStatus(tx.error)
    }
    setBusy('')
  }

  const postUserAdminRoute = async (userId: string, route: 'grant-manual-pro' | 'remove-manual-pro', body: Record<string, any>) => {
    setBusy(`${route}:${userId}`)
    setStatus('')
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/admin/users/${userId}/${route}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const text = await res.text()
      const next = text ? JSON.parse(text) : null
      if (!res.ok) throw new Error(next?.error || 'failed')
      setStatus(tx.updated)
      await load()
    } catch {
      setStatus(tx.error)
    }
    setBusy('')
  }

  const users = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.users || []).filter((u: any) => {
      if (!q) return true
      return `${u.id} ${u.display_name || ''} ${u.referral_code || ''}`.toLowerCase().includes(q)
    })
  }, [data, search])

  if (loading) return <div className="card" style={{ color: '#8a7a60' }}>{tx.loading}</div>
  if (loadError) return <div className="card" style={{ color: '#c05050' }}><p>{loadError}</p><button className="btn-outline" onClick={load}>{tx.refresh}</button></div>
  if (!data?.overview) return <div className="card" style={{ color: '#c05050' }}>{tx.error}</div>

  const overview = data.overview
  const statRows = [
    [tx.totalUsers, overview.total_users],
    [tx.active7, overview.active_7d],
    [tx.active30, overview.active_30d],
    [tx.pro, overview.pro_subscribers],
    [tx.mrr, `$${overview.mrr_estimate}`],
    [tx.aiMonth, overview.ai_generations_month],
    [tx.pageViews, overview.public_page_views_30d],
    [tx.subscribers, overview.newsletter_subscribers],
    [tx.embeds, overview.embeds_created_30d],
    [tx.songsPublished, overview.songs_published],
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 style={{ color: '#d4a843', margin: 0, fontWeight: 'normal' }}>{tx.title}</h2>
          <p style={{ color: '#8a7a60', margin: '6px 0 0', fontSize: 13 }}>{tx.desc}</p>
        </div>
        <button className="btn-outline" onClick={load}>{tx.refresh}</button>
      </div>
      {status && <div style={{ color: status === tx.updated ? '#7bc87b' : '#c05050', marginBottom: 12, fontSize: 13 }}>{status}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
        {statRows.map(([label, value]) => <Metric key={label} label={label} value={value} />)}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['users', 'ai', 'settings', 'billing', 'newsletter', 'moderation', 'feedback', 'sanity', 'system', 'audit'] as Section[]).map(s => (
          <button key={s} onClick={() => setSection(s)} style={tabStyle(section === s)}>{(tx as any)[s]}</button>
        ))}
      </div>

      {section === 'users' && (
        <div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tx.searchUsers} style={{ marginBottom: 12 }} />
          <DataTable headers={['User', tx.plan, tx.usage, tx.adminNotes, tx.overrides, '']}>
            {users.map((u: any) => {
              const stripePro = u.subscription?.plan_id === 'pro' && ['active', 'trialing', 'past_due'].includes(u.subscription?.status)
              const manualPro = !!u.manual_plan_override
              const planLabel = stripePro ? tx.proStripe : manualPro ? tx.proManual : tx.freePlan
              const planColor = stripePro ? '#7bc87b' : manualPro ? '#d4a843' : '#8a7a60'
              const disabled = !!u.disabled
              return (
                <tr key={u.id}>
                  <Td><strong>{u.display_name || u.referral_code || u.id.slice(0, 8)}</strong><Small>{u.id}</Small>{disabled && <Small color="#c05050">disabled</Small>}</Td>
                  <Td>
                    <Badge color={planColor}>{planLabel}</Badge>
                    <Small>{stripePro ? u.subscription?.status : manualPro ? (u.manual_plan_override.expires_at ? `expires ${String(u.manual_plan_override.expires_at).slice(0, 10)}` : 'no expiry') : 'free'}</Small>
                  </Td>
                  <Td><Small>AI {u.ai_usage} / fail {u.ai_failed}</Small><Small>{u.artists} artists · {u.songs} songs</Small></Td>
                  <Td><textarea value={drafts[`notes:${u.id}`] || ''} onChange={e => setDrafts({ ...drafts, [`notes:${u.id}`]: e.target.value })} rows={3} style={{ minWidth: 180 }} /></Td>
                  <Td><textarea value={drafts[`overrides:${u.id}`] || '{}'} onChange={e => setDrafts({ ...drafts, [`overrides:${u.id}`]: e.target.value })} rows={3} style={{ minWidth: 180, fontFamily: 'monospace', fontSize: 11 }} /></Td>
                  <Td>
                    <ActionRow>
                      <input type="date" value={drafts[`manual_expiry:${u.id}`] || ''} onChange={e => setDrafts({ ...drafts, [`manual_expiry:${u.id}`]: e.target.value })} title={tx.manualProExpiry} style={{ maxWidth: 138, fontSize: 11, padding: '5px 7px' }} />
                      <input value={drafts[`manual_reason:${u.id}`] || ''} onChange={e => setDrafts({ ...drafts, [`manual_reason:${u.id}`]: e.target.value })} placeholder={tx.manualProReason} style={{ maxWidth: 170, fontSize: 11, padding: '5px 7px' }} />
                      <button style={smallBtn('#7bc87b')} disabled={busy === `grant-manual-pro:${u.id}`} onClick={() => postUserAdminRoute(u.id, 'grant-manual-pro', { expires_at: drafts[`manual_expiry:${u.id}`] || null, reason: drafts[`manual_reason:${u.id}`] || '' })}>{tx.grantManualPro}</button>
                      <button style={smallBtn('#8a7a60')} disabled={busy === `remove-manual-pro:${u.id}`} onClick={() => postUserAdminRoute(u.id, 'remove-manual-pro', { reason: drafts[`manual_reason:${u.id}`] || '' })}>{tx.removeManualPro}</button>
                      <button style={smallBtn(disabled ? '#7bc87b' : '#c05050')} onClick={() => postAction({ action: 'disable_user', user_id: u.id, disabled: !disabled })}>{disabled ? tx.enable : tx.disable}</button>
                      <button style={smallBtn('#d4a843')} onClick={() => {
                        let overrides = {}
                        try { overrides = JSON.parse(drafts[`overrides:${u.id}`] || '{}') } catch {}
                        postAction({ action: 'update_user_admin', user_id: u.id, admin_notes: drafts[`notes:${u.id}`] || '', feature_overrides: overrides })
                      }}>{tx.save}</button>
                      <button style={smallBtn('#9ad0d4')} onClick={() => postAction({ action: 'refresh_subscription', user_id: u.id })}>{tx.refreshSub}</button>
                    </ActionRow>
                  </Td>
                </tr>
              )
            })}
          </DataTable>
        </div>
      )}

      {section === 'ai' && (
        <Grid>
          <Panel title={tx.providerModel}><Rows rows={(data.ai.usage_by_provider || []).map((r: any) => [`${r.provider} / ${r.model}`, `${r.total} · $${r.estimated_cost.toFixed(2)}`])} /></Panel>
          <Panel title={tx.topUsers}><Rows rows={(data.ai.top_users || []).map((r: any) => [r.profile?.display_name || r.user_id?.slice(0, 8), `${r.total} / fail ${r.failed}`])} /></Panel>
          <Panel title={tx.failedCalls}><Rows rows={(data.ai.failed_calls || []).slice(0, 12).map((r: any) => [r.provider || 'unknown', new Date(r.created_at).toLocaleString()])} /></Panel>
          <Panel title={`${tx.estimatedCost}: $${Number(data.ai.estimated_cost || 0).toFixed(2)}`}><Rows rows={(data.ai.monthly_trends || []).map((r: any) => [r.month, `${r.ai} / fail ${r.failed}`])} /></Panel>
        </Grid>
      )}

      {section === 'settings' && (
        <Grid>
          {(data.settings || []).map((s: any) => (
            <Panel key={s.key} title={s.key}>
              <textarea value={drafts[`setting:${s.key}`] || '{}'} onChange={e => setDrafts({ ...drafts, [`setting:${s.key}`]: e.target.value })} rows={8} style={{ fontFamily: 'monospace', fontSize: 12 }} />
              <button className="btn-gold" style={{ marginTop: 8 }} onClick={() => {
                let value = {}
                try { value = JSON.parse(drafts[`setting:${s.key}`] || '{}') } catch {}
                postAction({ action: 'update_setting', key: s.key, value, description: s.description })
              }}>{tx.save}</button>
            </Panel>
          ))}
        </Grid>
      )}

      {section === 'billing' && (
        <Grid>
          <Panel title={data.stripe.configured ? tx.stripeReady : tx.stripeMissing}>
            <Rows rows={(data.subscriptions || []).slice(0, 15).map((s: any) => [s.user_id?.slice(0, 8), `${s.plan_id} · ${s.status}`])} />
          </Panel>
          <Panel title={tx.webhookLogs}>
            <Rows rows={(data.subscription_events || []).map((e: any) => [e.event_type, `${e.status} · ${new Date(e.created_at).toLocaleString()}`])} />
          </Panel>
        </Grid>
      )}

      {section === 'newsletter' && (
        <Grid>
          <Panel title={tx.sourceAnalytics}><Rows rows={(data.newsletter.sources || []).map((r: any) => [r.source, r.total])} /></Panel>
          <Panel title={tx.topFanArtists}><Rows rows={(data.newsletter.top_artists || []).map((r: any) => [r.artist_name, r.total])} /></Panel>
        </Grid>
      )}

      {section === 'moderation' && (
        <Grid>
          <Panel title={tx.reportedPlaceholder}><p style={{ color: '#8a7a60', fontSize: 13 }}>{tx.reportedPlaceholder}</p></Panel>
          <Panel title={tx.hiddenArtists}><Rows rows={(data.moderation.hidden_artists || []).map((a: any) => [a.name, a.page_slug || a.id.slice(0, 8)])} /></Panel>
          <Panel title={tx.hiddenSongs}><Rows rows={(data.moderation.hidden_songs || []).map((s: any) => [s.title, s.status])} /></Panel>
          <Panel title={tx.adminHiddenEpks}>
            <Rows rows={(data.moderation.hidden_epks || []).map((a: any) => [a.name, a.slug || a.id?.slice(0, 8)])} />
          </Panel>
          <Panel title="Campaign safety">
            <p style={{ color: '#8a7a60', fontSize: 12 }}>{data.moderation.suspicious_proof_placeholder}</p>
            <p style={{ color: '#6a5a40', fontSize: 11, marginTop: 8 }}>{tx.adminRlsDoc}</p>
          </Panel>
        </Grid>
      )}

      {section === 'feedback' && (
        <Panel title={tx.feedbackInbox}>
          {(data.feedback || []).length === 0 ? (
            <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.feedbackEmpty}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data.feedback || []).map((item: any) => (
                <div key={item.id} style={{ border: '1px solid rgba(180,140,80,0.16)', borderRadius: 8, padding: 12, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div>
                      <Badge color={item.type === 'bug' ? '#e07070' : '#d4a843'}>{item.type}</Badge>
                      <span style={{ color: '#8a7a60', fontSize: 11, marginLeft: 8 }}>{item.page}</span>
                    </div>
                    <span style={{ color: '#6a5a40', fontSize: 11 }}>{new Date(item.created_at).toLocaleString()} · {item.status}</span>
                  </div>
                  <p style={{ color: '#c8c0b0', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5 }}>{item.message}</p>
                  <Small>{item.profiles?.display_name || item.profiles?.referral_code || item.user_id?.slice(0, 8) || 'anon'}</Small>
                  <ActionRow>
                    <button style={smallBtn('#d4a843')} onClick={() => postAction({ action: 'update_feedback_status', feedback_id: item.id, status: 'reviewed' })}>{tx.markReviewed}</button>
                    <button style={smallBtn('#7bc87b')} onClick={() => postAction({ action: 'update_feedback_status', feedback_id: item.id, status: 'resolved' })}>{tx.markResolved}</button>
                    <button style={smallBtn('#8a7a60')} onClick={() => postAction({ action: 'update_feedback_status', feedback_id: item.id, status: 'dismissed' })}>{tx.markDismissed}</button>
                  </ActionRow>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {section === 'sanity' && (
        <Panel title={tx.sanityTitle}>
          <p style={{ color: '#8a7a60', fontSize: 13, marginTop: 0 }}>{tx.sanityDesc}</p>
          <Rows rows={Object.entries(data.sanity || {}).map(([key, value]) => [
            key.replace(/_/g, ' '),
            typeof value === 'boolean' ? (value ? tx.ok : tx.missing) : String(value),
          ])} />
        </Panel>
      )}

      {section === 'system' && (
        <AdminSystemHealthPanel system={data.system} tx={tx as Record<string, string>} />
      )}

      {section === 'audit' && (
        <DataTable headers={['Action', 'Actor', 'Target', 'Date']}>
          {(data.audit_log || []).map((a: any) => (
            <tr key={a.id}><Td>{a.action}</Td><Td>{a.actor_id?.slice(0, 8)}</Td><Td>{a.target_type || a.target_user_id?.slice(0, 8) || '-'}</Td><Td>{new Date(a.created_at).toLocaleString()}</Td></tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: any; value: any }) {
  return <div className="card" style={{ padding: 12 }}><div style={{ color: '#e8e0d0', fontSize: 22, fontWeight: 800 }}>{value}</div><div style={{ color: '#6a5a40', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div></div>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card"><h3 style={{ margin: '0 0 10px', color: '#d4a843', fontSize: 14, fontWeight: 'normal' }}>{title}</h3>{children}</div>
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>{children}</div>
}

function Rows({ rows }: { rows: any[][] }) {
  if (!rows.length) return <p style={{ color: '#6a5a40', fontSize: 13, margin: 0 }}>-</p>
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{rows.map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid rgba(180,140,80,0.08)', paddingBottom: 6 }}><span style={{ color: '#c8c0b0', fontSize: 12 }}>{r[0]}</span><span style={{ color: '#8a7a60', fontSize: 12, textAlign: 'right' }}>{r[1]}</span></div>)}</div>
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="card" style={{ padding: 0, overflow: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980, fontSize: 12 }}><thead><tr>{headers.map(h => <th key={h} style={{ textAlign: 'left', padding: 10, color: '#8a7a60', fontWeight: 'normal', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: 10, borderTop: '1px solid rgba(180,140,80,0.08)', verticalAlign: 'top', color: '#c8c0b0' }}>{children}</td>
}

function Small({ children, color = '#6a5a40' }: { children: React.ReactNode; color?: string }) {
  return <div style={{ color, fontSize: 10, marginTop: 3, wordBreak: 'break-all' }}>{children}</div>
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ color, border: `1px solid ${color}55`, borderRadius: 10, padding: '2px 8px', fontSize: 10 }}>{children}</span>
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{children}</div>
}

function smallBtn(color: string): React.CSSProperties {
  return { background: 'transparent', border: `1px solid ${color}66`, color, borderRadius: 4, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }
}

function tabStyle(active: boolean): React.CSSProperties {
  return { background: active ? 'rgba(212,168,67,0.12)' : 'transparent', color: active ? '#d4a843' : '#8a7a60', border: active ? '1px solid #d4a843' : '1px solid rgba(180,140,80,0.18)', borderRadius: 16, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }
}
