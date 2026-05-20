'use client'

import { useEffect, useState } from 'react'
import { fetchCampaignPassiveHealth } from '@/lib/playlistCommunities/client'
import type { CampaignHealthScore } from '@/lib/passiveParticipation/types'
import { t, useLang } from '@/lib/i18n'

type Props = { campaignId: string }

export default function CampaignPassiveHealthPanel({ campaignId }: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [health, setHealth] = useState<CampaignHealthScore | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchCampaignPassiveHealth(campaignId)
        if (!cancelled && data?.health) setHealth(data.health)
      } catch {
        /* ignore */
      }
    })()
    return () => { cancelled = true }
  }, [campaignId])

  if (!health) return null

  const factors = [
    { key: 'campaignHealthFactorActive', value: health.factors.activeMembers },
    { key: 'campaignHealthFactorProof', value: health.factors.proofConsistency },
    { key: 'campaignHealthFactorConfidence', value: health.factors.confidenceQuality },
    { key: 'campaignHealthFactorMissed', value: 100 - health.factors.missedActivity },
    { key: 'campaignHealthFactorFrequency', value: health.factors.participationFrequency },
  ]

  return (
    <div className="card campaign-passive-health">
      <h3 className="campaign-passive-health__title">{tx.campaignHealthPassiveTitle}</h3>
      <p className="campaign-passive-health__score">
        {tx.campaignHealthPassiveScore.replace('{score}', String(health.score))}
        {' · '}
        <span>{tx[health.labelKey]}</span>
      </p>
      <p className="campaign-passive-health__compliance">{tx.passiveParticipationComplianceShort}</p>
      <ul className="campaign-passive-health__factors">
        {factors.map(f => (
          <li key={f.key}>
            <span>{tx[f.key]}</span>
            <span className="campaign-passive-health__bar">
              <span className="campaign-passive-health__fill" style={{ width: `${f.value}%` }} />
            </span>
            <span className="campaign-passive-health__pct">{f.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
