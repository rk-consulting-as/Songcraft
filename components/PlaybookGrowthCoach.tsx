'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchPlaybookContext } from '@/lib/playbook/fetchContext'
import { computePlaybookEngine } from '@/lib/playbook/computeEngine'
import type { GrowthEngineSnapshot } from '@/lib/playbook/growthTypes'
import { t, useLang } from '@/lib/i18n'

type Props = {
  artistId?: string | null
}

export default function PlaybookGrowthCoach({ artistId }: Props) {
  const lang = useLang()
  const tx = t[lang]
  const [growth, setGrowth] = useState<GrowthEngineSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ctx = await fetchPlaybookContext(artistId)
      if (!ctx || cancelled) return
      const engine = computePlaybookEngine(ctx, lang, ctx.planId || 'free')
      setGrowth(engine.growth)
    })()
    return () => { cancelled = true }
  }, [lang, artistId])

  if (!growth || growth.growthScorePercent >= 100) return null

  const rec = growth.nextRecommendation
  const accent = '#d4a843'

  return (
    <div className="card growth-coach-card" style={{ marginBottom: 24, borderColor: 'rgba(180,140,80,0.25)', background: 'rgba(180,140,80,0.04)', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: '0 0 4px', color: '#8a7a60', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{tx.growthCoachTitle}</p>
          <p style={{ margin: '0 0 8px', color: '#e8e0d0', fontSize: 15, lineHeight: 1.45 }}>
            {rec?.description || tx.growthCoachDefault}
          </p>
          {rec && <p style={{ margin: 0, color: accent, fontSize: 13, fontWeight: 500 }}>{rec.title}</p>}
        </div>
        <div style={{ textAlign: 'right', minWidth: 100 }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#fff' }}>{growth.growthScorePercent}%</p>
          <p style={{ margin: '4px 0 0', color: '#8a7a60', fontSize: 11 }}>{tx.growthScoreLabel}</p>
          <p style={{ margin: '2px 0 0', color: accent, fontSize: 11 }}>{growth.tierLabel}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {rec?.href && (
          <Link href={rec.href} className="btn-gold" style={{ textDecoration: 'none', fontSize: 13 }}>
            {tx.playbookContinue} →
          </Link>
        )}
        <Link href="/playbook?tab=growth" className="btn-outline quick-action-btn" style={{ textDecoration: 'none', fontSize: 13 }}>
          {tx.continueGrowthJourney} →
        </Link>
      </div>
    </div>
  )
}
