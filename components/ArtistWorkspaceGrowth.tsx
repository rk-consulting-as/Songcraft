'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchPlaybookContext } from '@/lib/playbook/fetchContext'
import { computePlaybookEngine } from '@/lib/playbook/computeEngine'
import type { GrowthEngineSnapshot } from '@/lib/playbook/growthTypes'
import GrowthEnginePanel from '@/components/GrowthEnginePanel'
import { t, useLang } from '@/lib/i18n'

type Props = {
  artistId: string
}

export default function ArtistWorkspaceGrowth({ artistId }: Props) {
  const lang = useLang()
  const tx = t[lang]
  const [growth, setGrowth] = useState<GrowthEngineSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const ctx = await fetchPlaybookContext(artistId)
      if (!ctx || cancelled) {
        setLoading(false)
        return
      }
      const engine = computePlaybookEngine(ctx, lang, ctx.planId || 'free')
      if (!cancelled) {
        setGrowth(engine.growth)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [artistId, lang])

  if (loading) {
    return <p style={{ color: '#8a7a60', fontSize: 14 }}>{tx.loading}</p>
  }

  if (!growth) return null

  return (
    <section className="artist-workspace-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', color: '#d4a843', fontWeight: 'normal', fontSize: 18 }}>{tx.growthEngineTitle}</h2>
          <p style={{ margin: 0, color: '#8a7a60', fontSize: 13, maxWidth: 520, lineHeight: 1.5 }}>{tx.growthEngineSubtitle}</p>
        </div>
        <Link href={`/playbook?tab=growth&artist=${artistId}`} className="btn-outline" style={{ textDecoration: 'none', fontSize: 13 }}>
          {tx.growthViewFullPlaybook} →
        </Link>
      </div>
      <GrowthEnginePanel
        growth={growth}
        compact={false}
        showMissions
        showEmptyStates
        playbookHref={`/playbook?tab=growth&artist=${artistId}`}
      />
    </section>
  )
}
