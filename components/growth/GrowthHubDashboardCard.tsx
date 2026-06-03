'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchGrowthHubSnapshot } from '@/lib/growth/fetchHubSnapshot'
import { t, useLang } from '@/lib/i18n'

type Props = {
  artistId?: string | null
}

export default function GrowthHubDashboardCard({ artistId }: Props) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [activeCampaigns, setActiveCampaigns] = useState(0)
  const [pendingProofs, setPendingProofs] = useState(0)
  const [nextStep, setNextStep] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const snap = await fetchGrowthHubSnapshot(artistId, lang)
      if (cancelled || !snap) {
        setLoading(false)
        return
      }
      const { engine, participation, ownedCampaigns, joinedCampaigns } = snap
      const active = [...ownedCampaigns, ...joinedCampaigns].filter(c =>
        ['open', 'active'].includes(c.status)
      ).length
      setScore(engine.growth.growthScorePercent)
      setActiveCampaigns(active)
      setPendingProofs(
        (participation?.pendingReviews || 0) + (participation?.joinedNeedingProofToday || 0)
      )
      setNextStep(engine.growth.nextRecommendation?.title || engine.progress.nextTask?.label || null)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [artistId, lang])

  const growthHref = artistId ? `/growth?artist=${artistId}` : '/growth'

  if (loading) {
    return (
      <div className="card growth-hub-dashboard-card" style={{ marginBottom: 24, padding: 20 }}>
        <p style={{ color: '#8a7a60', fontSize: 13, margin: 0 }}>{tx.loading}</p>
      </div>
    )
  }

  return (
    <div className="card growth-hub-dashboard-card" style={{ marginBottom: 24, borderColor: 'rgba(212,168,67,0.28)', background: 'rgba(212,168,67,0.04)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ margin: '0 0 6px', color: '#d4a843', fontWeight: 'normal', fontSize: 16 }}>{tx.growthHubDashboardTitle}</h2>
          <p style={{ margin: 0, color: '#8a7a60', fontSize: 13, lineHeight: 1.5 }}>{tx.growthHubDashboardDesc}</p>
          {nextStep && (
            <p style={{ margin: '10px 0 0', color: '#c8c0b0', fontSize: 13 }}>
              <span style={{ color: '#6a5a40', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{tx.growthHubPlaybookNextStep}: </span>
              {nextStep}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="growth-hub-stat-pill">
            <span className="growth-hub-stat-pill__value">{score}%</span>
            <span className="growth-hub-stat-pill__label">{tx.growthScoreLabel}</span>
          </div>
          <div className="growth-hub-stat-pill">
            <span className="growth-hub-stat-pill__value">{activeCampaigns}</span>
            <span className="growth-hub-stat-pill__label">{tx.growthHubActiveCampaigns}</span>
          </div>
          <div className="growth-hub-stat-pill">
            <span className="growth-hub-stat-pill__value">{pendingProofs}</span>
            <span className="growth-hub-stat-pill__label">{tx.growthHubPendingProofs}</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Link href={growthHref} className="btn-gold quick-action-btn" style={{ textDecoration: 'none', fontSize: 13 }}>
          {tx.growthHubOpen} →
        </Link>
      </div>
    </div>
  )
}
