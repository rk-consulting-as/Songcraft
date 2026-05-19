'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchPlaybookContext } from '@/lib/playbook/fetchContext'
import { computePlaybookProgress } from '@/lib/playbook/compute'
import type { PlaybookProgress } from '@/lib/playbook/types'
import { t, useLang } from '@/lib/i18n'

function ProgressBar({ percent, accent = '#d4a843' }: { percent: number; accent?: string }) {
  return (
    <div className="playbook-progress-track" aria-hidden>
      <div className="playbook-progress-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: accent }} />
    </div>
  )
}

export default function PlaybookPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = useLang()
  const tx = t[lang]
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<PlaybookProgress | null>(null)

  const load = async (selectedId?: string | null) => {
    setLoading(true)
    const ctx = await fetchPlaybookContext(selectedId)
    if (!ctx) {
      router.push('/login')
      return
    }
    setProgress(computePlaybookProgress(ctx, lang))
    setLoading(false)
  }

  useEffect(() => {
    load(searchParams.get('artist'))
  }, [lang, searchParams])

  if (loading || !progress) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#8a7a60', padding: 40 }}>{tx.loading}</div>
  }

  const accent = '#d4a843'

  return (
    <main className="playbook-page" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #12071e 50%, #0a0f0a 100%)', color: '#e8e0d0' }}>
      <div className="app-header" data-header="page" style={{ borderBottom: '1px solid rgba(180,140,80,0.2)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: '#6a5a40', textDecoration: 'none', fontSize: 13 }}>← {tx.dashboard}</Link>
          <span style={{ color: '#3a3530' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: accent, letterSpacing: 1 }}>{tx.playbookTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/onboarding" className="btn-outline" style={{ textDecoration: 'none' }}>{tx.playbookQuickSetup}</Link>
          {progress.primaryArtist && (
            <Link href={`/artist/${progress.primaryArtist.id}`} className="btn-outline" style={{ textDecoration: 'none' }}>
              {tx.playbookOpenArtist}
            </Link>
          )}
        </div>
      </div>

      <div className="page-pad playbook-page-body" style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 100px' }}>
        <p style={{ color: '#8a7a60', fontSize: 14, lineHeight: 1.55, margin: '0 0 24px', maxWidth: 640 }}>{tx.playbookSubtitle}</p>

        {progress.contextualPrompt && (
          <div className="card playbook-prompt-card" style={{ marginBottom: 24, borderColor: 'rgba(212,168,67,0.35)', background: 'rgba(212,168,67,0.06)' }}>
            <p style={{ margin: 0, color: '#e8e0d0', fontSize: 14, lineHeight: 1.5 }}>{progress.contextualPrompt}</p>
          </div>
        )}

        <div className="card playbook-hero-card" style={{ marginBottom: 24, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 6px', color: '#8a7a60', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{tx.playbookOverallScore}</p>
              <p style={{ margin: 0, fontSize: 42, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{progress.overallPercent}%</p>
              <ProgressBar percent={progress.overallPercent} accent={accent} />
            </div>
            {progress.nextTask && (
              <div style={{ flex: '1 1 280px', minWidth: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,80,0.14)', borderRadius: 10, padding: 16 }}>
                <p style={{ margin: '0 0 8px', color: accent, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.playbookNextStep}</p>
                <p style={{ margin: '0 0 12px', color: '#e8e0d0', fontSize: 14, fontWeight: 500 }}>{progress.nextTask.label}</p>
                {progress.nextTask.href && (
                  <Link href={progress.nextTask.href} className="btn-gold" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    {tx.playbookContinue} →
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="playbook-rec-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 20 }}>
            {progress.releaseTask && progress.releaseTask.id !== progress.nextTask?.id && (
              <div className="playbook-rec-card">
                <span className="playbook-rec-label">{tx.playbookRecommendedRelease}</span>
                <span className="playbook-rec-task">{progress.releaseTask.label}</span>
                {progress.releaseTask.href && <Link href={progress.releaseTask.href} style={{ color: accent, fontSize: 12 }}>{tx.playbookContinue} →</Link>}
              </div>
            )}
            {progress.growthTask && progress.growthTask.id !== progress.nextTask?.id && (
              <div className="playbook-rec-card">
                <span className="playbook-rec-label">{tx.playbookRecommendedGrowth}</span>
                <span className="playbook-rec-task">{progress.growthTask.label}</span>
                {progress.growthTask.href && <Link href={progress.growthTask.href} style={{ color: accent, fontSize: 12 }}>{tx.playbookContinue} →</Link>}
              </div>
            )}
          </div>
        </div>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ margin: '0 0 14px', color: accent, fontWeight: 'normal', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.playbookMilestones}</h2>
          <div className="playbook-milestones">
            {progress.milestones.map(m => (
              <div key={m.id} className={`playbook-milestone${m.done ? ' is-done' : ''}`} title={m.label}>
                <span className="playbook-milestone-icon">{m.icon}</span>
                <span className="playbook-milestone-label">{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        {progress.categories.map(cat => (
          <section key={cat.id} className="card playbook-category-card" style={{ marginBottom: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 16, color: '#e8e0d0', fontWeight: 600 }}>{cat.label}</h2>
              <span style={{ color: '#8a7a60', fontSize: 12 }}>{cat.doneCount}/{cat.totalCount} · {cat.percent}%</span>
            </div>
            <ProgressBar percent={cat.percent} accent={accent} />
            <ul className="playbook-task-list" style={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
              {cat.tasks.map(task => (
                <li key={task.id} className={`playbook-task${task.done ? ' is-done' : ''}`}>
                  <span className="playbook-task-check" aria-hidden>{task.done ? '✓' : '○'}</span>
                  <div className="playbook-task-body">
                    <span className="playbook-task-label">{task.label}</span>
                    {task.description && <span className="playbook-task-desc">{task.description}</span>}
                  </div>
                  {!task.done && task.href && (
                    <Link href={task.href} className="playbook-task-link">{tx.playbookContinue}</Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
