'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchGrowthHubSnapshot } from '@/lib/growth/fetchHubSnapshot'
import { t, useLang } from '@/lib/i18n'

type Props = {
  artistId: string
}

export default function ArtistWorkspaceGrowth({ artistId }: Props) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [progress, setProgress] = useState(0)
  const [pending, setPending] = useState(0)
  const [nextStep, setNextStep] = useState<string | null>(null)
  const [recentActivity, setRecentActivity] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const snap = await fetchGrowthHubSnapshot(artistId, lang)
      if (cancelled || !snap) {
        setLoading(false)
        return
      }
      setScore(snap.engine.growth.growthScorePercent)
      setProgress(snap.engine.progress.overallPercent)
      setPending(
        (snap.participation?.pendingReviews || 0) + (snap.participation?.joinedNeedingProofToday || 0)
      )
      setNextStep(
        snap.engine.growth.nextRecommendation?.title || snap.engine.progress.nextTask?.label || null
      )
      const digest = snap.digest
      if (digest && digest.proofsApproved > 0) {
        setRecentActivity(tx.growthHubRecentParticipation.replace('{n}', String(digest.proofsApproved)))
      } else if (snap.participation?.weekCompletionPercent) {
        setRecentActivity(`${snap.participation.weekCompletionPercent}% ${tx.dashboardWeekCompletion}`)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [artistId, lang, tx])

  if (loading) {
    return <p style={{ color: '#8a7a60', fontSize: 14 }}>{tx.loading}</p>
  }

  return (
    <section className="artist-workspace-section workspace-section">
      <div className="card workspace-card workspace-glass growth-hub-pointer">
        <h2 style={{ margin: '0 0 8px', color: '#d4a843', fontWeight: 'normal', fontSize: 18 }}>{tx.workspaceShellGrowth}</h2>
        <p style={{ margin: '0 0 16px', color: '#8a7a60', fontSize: 13, lineHeight: 1.55, maxWidth: 520 }}>
          {tx.growthHubArtistTabDesc}
        </p>
        <div className="growth-hub-stat-grid" style={{ marginBottom: 16 }}>
          <div className="growth-hub-stat-tile">
            <span className="growth-hub-stat-tile__value">{score}%</span>
            <span className="growth-hub-stat-tile__label">{tx.growthScoreLabel}</span>
          </div>
          <div className="growth-hub-stat-tile">
            <span className="growth-hub-stat-tile__value">{progress}%</span>
            <span className="growth-hub-stat-tile__label">{tx.growthHubArtistProgress}</span>
          </div>
          <div className="growth-hub-stat-tile">
            <span className="growth-hub-stat-tile__value">{pending}</span>
            <span className="growth-hub-stat-tile__label">{tx.growthHubPendingProofs}</span>
          </div>
        </div>
        {nextStep && (
          <p style={{ margin: '0 0 8px', color: '#c8c0b0', fontSize: 13 }}>
            <span style={{ color: '#6a5a40', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{tx.growthHubPlaybookNextStep}: </span>
            {nextStep}
          </p>
        )}
        {recentActivity && (
          <p style={{ margin: '0 0 16px', color: '#8a7a60', fontSize: 12 }}>{recentActivity}</p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`/growth?artist=${artistId}`} className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
            {tx.growthHubOpen} →
          </Link>
          <Link href={`/playbook?tab=growth&artist=${artistId}`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>
            {tx.growthOpenPlaybook}
          </Link>
        </div>
      </div>
    </section>
  )
}
