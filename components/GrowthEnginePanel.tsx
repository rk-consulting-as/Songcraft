'use client'

import Link from 'next/link'
import type { GrowthEngineSnapshot } from '@/lib/playbook/growthTypes'
import { t, useLang } from '@/lib/i18n'

type Props = {
  growth: GrowthEngineSnapshot
  accent?: string
  compact?: boolean
  showMissions?: boolean
  showEmptyStates?: boolean
  playbookHref?: string | null
}

function ProgressBar({ percent, accent = '#d4a843' }: { percent: number; accent?: string }) {
  return (
    <div className="playbook-progress-track" aria-hidden>
      <div className="playbook-progress-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: accent }} />
    </div>
  )
}

function DifficultyPill({ level, label }: { level: string; label: string }) {
  return <span className={`growth-difficulty growth-difficulty--${level}`}>{label}</span>
}

export default function GrowthEnginePanel({
  growth,
  accent = '#d4a843',
  compact = false,
  showMissions = true,
  showEmptyStates = true,
  playbookHref = '/playbook?tab=growth',
}: Props) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>

  const diffLabels: Record<string, string> = {
    easy: tx.growthDifficultyEasy || 'Easy',
    medium: tx.growthDifficultyMedium || 'Medium',
    advanced: tx.growthDifficultyAdvanced || 'Advanced',
  }

  return (
    <div className={`growth-engine-panel${compact ? ' is-compact' : ''}`}>
      <div className="growth-engine-hero card" style={{ padding: compact ? 16 : 20, marginBottom: compact ? 16 : 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <p className="growth-score-label">{tx.growthScoreLabel}</p>
            <p className="growth-score-value">{growth.growthScorePercent}%</p>
            <ProgressBar percent={growth.growthScorePercent} accent={accent} />
            <p className="growth-tier-line">
              <span className="growth-tier-badge">{growth.tierLabel}</span>
              <span className="growth-creator-level">{growth.creatorLevel}</span>
            </p>
            <p className="growth-mission-count">
              {growth.completedMissionCount}/{growth.totalMissionCount} {tx.growthMissionsComplete}
            </p>
          </div>
          {growth.nextRecommendation && (
            <div className="growth-next-rec" style={{ flex: '1 1 260px', minWidth: 0 }}>
              <p className="growth-rec-label">{tx.growthNextRecommended}</p>
              <p className="growth-rec-title">{growth.nextRecommendation.title}</p>
              <p className="growth-rec-desc">{growth.nextRecommendation.description}</p>
              {growth.nextRecommendation.href && (
                <Link href={growth.nextRecommendation.href} className="btn-gold" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 8, fontSize: 13 }}>
                  {tx.playbookContinue} →
                </Link>
              )}
            </div>
          )}
        </div>
        {!compact && (
          <div className="playbook-rec-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
            {growth.releaseRecommendation && growth.releaseRecommendation.missionId !== growth.nextRecommendation?.missionId && (
              <div className="playbook-rec-card">
                <span className="playbook-rec-label">{tx.playbookRecommendedRelease}</span>
                <span className="playbook-rec-task">{growth.releaseRecommendation.title}</span>
                {growth.releaseRecommendation.href && (
                  <Link href={growth.releaseRecommendation.href} style={{ color: accent, fontSize: 12 }}>{tx.playbookContinue} →</Link>
                )}
              </div>
            )}
            {growth.growthRecommendation && growth.growthRecommendation.missionId !== growth.nextRecommendation?.missionId && (
              <div className="playbook-rec-card">
                <span className="playbook-rec-label">{tx.playbookRecommendedGrowth}</span>
                <span className="playbook-rec-task">{growth.growthRecommendation.title}</span>
                {growth.growthRecommendation.href && (
                  <Link href={growth.growthRecommendation.href} style={{ color: accent, fontSize: 12 }}>{tx.playbookContinue} →</Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {growth.upgradePrompt && (
        <div className="card growth-upgrade-card" style={{ marginBottom: 16, padding: 16, borderColor: 'rgba(180,140,80,0.2)' }}>
          <p style={{ margin: '0 0 6px', color: accent, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{growth.upgradePrompt.title}</p>
          <p style={{ margin: '0 0 12px', color: '#a09080', fontSize: 13, lineHeight: 1.5 }}>{growth.upgradePrompt.description}</p>
          <Link href={growth.upgradePrompt.href} className="btn-outline" style={{ textDecoration: 'none', fontSize: 13 }}>
            {tx[growth.upgradePrompt.ctaKey] || tx.upgradeSoftCta}
          </Link>
        </div>
      )}
      {showEmptyStates && growth.emptyStates.length > 0 && (
        <div className="growth-empty-states" style={{ marginBottom: 16 }}>
          {growth.emptyStates.map(s => (
            <div key={s.id} className="growth-empty-state card" style={{ padding: 14, marginBottom: 8 }}>
              <p style={{ margin: 0, color: '#c8b8a0', fontSize: 13, lineHeight: 1.5 }}>{s.message}</p>
              {s.href && (
                <Link href={s.href} style={{ color: accent, fontSize: 12, marginTop: 8, display: 'inline-block' }}>
                  {tx.playbookContinue} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
      <section style={{ marginBottom: compact ? 16 : 24 }}>
        <h3 className="growth-section-title">{tx.growthAchievements}</h3>
        <div className="playbook-milestones growth-milestones">
          {growth.milestones.map(m => (
            <div key={m.id} className={`playbook-milestone growth-milestone${m.done ? ' is-done' : ''}`} title={m.label}>
              <span className="playbook-milestone-icon">{m.icon}</span>
              <span className="playbook-milestone-label">{m.label}</span>
              {m.done && m.badge && <span className="growth-milestone-badge">{m.badge}</span>}
            </div>
          ))}
        </div>
      </section>
      {showMissions && growth.categories.map(cat => (
        <section key={cat.id} className="card playbook-category-card growth-mission-category" style={{ marginBottom: 14, padding: compact ? 14 : 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#e8e0d0', fontWeight: 600 }}>{cat.label}</h3>
            <span style={{ color: '#8a7a60', fontSize: 12 }}>{cat.doneCount}/{cat.totalCount} · {cat.percent}%</span>
          </div>
          <ProgressBar percent={cat.percent} accent={accent} />
          <ul className="playbook-task-list growth-mission-list" style={{ listStyle: 'none', margin: '14px 0 0', padding: 0 }}>
            {cat.missions.map(mission => (
              <li key={mission.id} className={`playbook-task growth-mission${mission.done ? ' is-done' : ''}${mission.locked ? ' is-locked' : ''}`}>
                <span className="playbook-task-check" aria-hidden>{mission.done ? '✓' : '○'}</span>
                <div className="playbook-task-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="playbook-task-label">{mission.label}</span>
                    <DifficultyPill level={mission.difficulty} label={diffLabels[mission.difficulty] || mission.difficulty} />
                    {mission.locked && <span className="growth-locked-tag">{tx.growthMissionPro}</span>}
                  </div>
                  {mission.description && <span className="playbook-task-desc">{mission.description}</span>}
                </div>
                {!mission.done && mission.href && !mission.locked && (
                  <Link href={mission.href} className="playbook-task-link">{tx.playbookContinue}</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {playbookHref && !compact && (
        <p style={{ marginTop: 8, textAlign: 'center' }}>
          <Link href={playbookHref} style={{ color: '#8a7a60', fontSize: 13 }}>{tx.growthViewFullPlaybook} →</Link>
        </p>
      )}
    </div>
  )
}
