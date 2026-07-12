'use client'

type Props = {
  system: {
    migrations?: { checks: Array<{ table: string; label: string; exists: boolean; migrationHint: string }>; allPresent: boolean; missing: string[] }
    readiness?: { items: Array<{ id: string; label: string; status: string; detail: string }>; ready: boolean; warnCount: number; missingCount: number }
    v2_community?: {
      migrationsOk: boolean
      upcomingSessions: number
      liveSessions: number
      publicCircles: number
      privateCircles: number
      notificationRows: number
      orphanedSessionSongs: number
      orphanedRoomItems: number
      communityFeedback30d: number
      activeCommunityUsers7d: number
      seedLikelyPresent: boolean
      warnings: string[]
      migrationChecks?: Array<{ table: string; label: string; exists: boolean; migrationHint: string }>
    }
    visibility_audit?: Array<{ id: string; surface: string; route: string; filters: string[]; status: string; notes: string }>
    plan_gating?: Record<string, unknown>
    recent_admin_actions?: Array<{ action: string; actor_id: string; created_at: string }>
    failed_api_warnings?: Array<{ provider: string; feature: string; at: string }>
  } | null
  tx: Record<string, string>
}

function statusColor(status: string) {
  if (status === 'ok' || status === 'implemented') return '#7bc87b'
  if (status === 'missing') return '#c05050'
  if (status === 'warn') return '#d4a843'
  return '#8a7a60'
}

export default function AdminSystemHealthPanel({ system, tx }: Props) {
  if (!system) return <p style={{ color: '#6a5a40', fontSize: 13 }}>{tx.adminSystemNoData}</p>

  const migrations = system.migrations
  const readiness = system.readiness

  return (
    <div className="admin-system-health">
      {readiness && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 8px', color: '#d4a843', fontSize: 14, fontWeight: 'normal' }}>
            {tx.adminBetaReadinessTitle}
            {readiness.ready ? (
              <span style={{ color: '#7bc87b', marginLeft: 8, fontSize: 12 }}>✓ {tx.adminBetaReady}</span>
            ) : (
              <span style={{ color: '#c05050', marginLeft: 8, fontSize: 12 }}>
                {readiness.missingCount} {tx.adminBetaMissing}
              </span>
            )}
          </h3>
          <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 12px' }}>{tx.adminBetaReadinessDesc}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {readiness.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, borderBottom: '1px solid rgba(180,140,80,0.08)', paddingBottom: 6 }}>
                <span style={{ color: '#c8c0b0' }}>{item.label}</span>
                <span style={{ color: statusColor(item.status), textAlign: 'right', maxWidth: '55%' }}>{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {system.v2_community && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 8px', color: '#d4a843', fontSize: 14, fontWeight: 'normal' }}>
            ViaTone 2.0 Community health
            {system.v2_community.migrationsOk ? (
              <span style={{ color: '#7bc87b', marginLeft: 8, fontSize: 12 }}>✓ migrations</span>
            ) : (
              <span style={{ color: '#c05050', marginLeft: 8, fontSize: 12 }}>missing tables</span>
            )}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
            {[
              ['Upcoming sessions', system.v2_community.upcomingSessions],
              ['Live now', system.v2_community.liveSessions],
              ['Public circles', system.v2_community.publicCircles],
              ['Private circles', system.v2_community.privateCircles],
              ['Notifications', system.v2_community.notificationRows],
              ['Community feedback (30d)', system.v2_community.communityFeedback30d],
              ['Active users (7d)', system.v2_community.activeCommunityUsers7d],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ color: '#6a5a40', fontSize: 10 }}>{label}</div>
                <div style={{ color: '#e8e0d0', fontSize: 16 }}>{value}</div>
              </div>
            ))}
          </div>
          <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 8px' }}>
            Seed data: {system.v2_community.seedLikelyPresent ? 'likely present' : 'not detected'} ·
            Orphaned session songs: {system.v2_community.orphanedSessionSongs} ·
            Orphaned room items: {system.v2_community.orphanedRoomItems}
          </p>
          {system.v2_community.warnings.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, color: '#d4a843', fontSize: 11 }}>
              {system.v2_community.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          {system.v2_community.migrationChecks && !system.v2_community.migrationsOk && (
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', marginTop: 10 }}>
              <tbody>
                {system.v2_community.migrationChecks.filter(c => !c.exists).map(c => (
                  <tr key={c.table}>
                    <td style={{ color: '#c05050', padding: '4px 0' }}>{c.label}</td>
                    <td style={{ color: '#6a5a40' }}>{c.migrationHint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ color: '#6a5a40', fontSize: 11, margin: '10px 0 0' }}>
            Beta feedback: floating button on all pages · Admin → Feedback inbox · Docs: VIATONE_V2_BETA_TEST_SCRIPT.md
          </p>
        </div>
      )}

      {migrations && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 8px', color: '#d4a843', fontSize: 14, fontWeight: 'normal' }}>{tx.adminMigrationHealthTitle}</h3>
          {!migrations.allPresent && (
            <p style={{ color: '#c05050', fontSize: 12, margin: '0 0 10px' }}>
              {tx.adminMigrationMissing}: {migrations.missing.join(', ')}
            </p>
          )}
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: '#8a7a60', padding: '6px 0' }}>{tx.adminMigrationTable}</th>
                <th style={{ textAlign: 'left', color: '#8a7a60' }}>{tx.adminMigrationStatus}</th>
                <th style={{ textAlign: 'left', color: '#8a7a60' }}>{tx.adminMigrationHint}</th>
              </tr>
            </thead>
            <tbody>
              {migrations.checks.map(c => (
                <tr key={c.table}>
                  <td style={{ color: '#e8e0d0', padding: '6px 0' }}>{c.label}</td>
                  <td style={{ color: c.exists ? '#7bc87b' : '#c05050' }}>{c.exists ? tx.adminOk : tx.adminMissing}</td>
                  <td style={{ color: '#6a5a40', fontSize: 11 }}>{c.migrationHint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {system.visibility_audit && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 8px', color: '#d4a843', fontSize: 14, fontWeight: 'normal' }}>{tx.adminVisibilityAuditTitle}</h3>
          <p style={{ color: '#8a7a60', fontSize: 12, margin: '0 0 12px' }}>{tx.adminVisibilityAuditDesc}</p>
          {(system.visibility_audit || []).map(rule => (
            <div key={rule.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(180,140,80,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ color: '#e8e0d0', fontSize: 13 }}>{rule.surface}</strong>
                <span style={{ color: statusColor(rule.status), fontSize: 11 }}>{rule.status}</span>
              </div>
              <div style={{ color: '#6a5a40', fontSize: 11, marginTop: 4 }}>{rule.route}</div>
              <p style={{ color: '#8a7a60', fontSize: 11, margin: '6px 0 0' }}>{rule.notes}</p>
            </div>
          ))}
        </div>
      )}

      {system.plan_gating && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: '0 0 8px', color: '#d4a843', fontSize: 14, fontWeight: 'normal' }}>{tx.adminPlanGatingTitle}</h3>
          <pre style={{ margin: 0, fontSize: 11, color: '#8a7a60', overflow: 'auto' }}>{JSON.stringify(system.plan_gating, null, 2)}</pre>
        </div>
      )}

      {(system.failed_api_warnings?.length || system.recent_admin_actions?.length) ? (
        <div className="card">
          <h3 style={{ margin: '0 0 8px', color: '#d4a843', fontSize: 14, fontWeight: 'normal' }}>{tx.adminSafetyWarningsTitle}</h3>
          {system.failed_api_warnings?.length ? (
            <>
              <p style={{ color: '#c08060', fontSize: 12 }}>{tx.adminFailedApiWarnings}</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#8a7a60', fontSize: 11 }}>
                {system.failed_api_warnings.map((w, i) => (
                  <li key={i}>{w.provider} · {w.feature} · {new Date(w.at).toLocaleString()}</li>
                ))}
              </ul>
            </>
          ) : null}
          {system.recent_admin_actions?.length ? (
            <>
              <p style={{ color: '#8a7a60', fontSize: 12, marginTop: 12 }}>{tx.adminRecentActions}</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#8a7a60', fontSize: 11 }}>
                {system.recent_admin_actions.slice(0, 8).map((a, i) => (
                  <li key={i}>{a.action} · {a.actor_id?.slice(0, 8)} · {new Date(a.created_at).toLocaleString()}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
