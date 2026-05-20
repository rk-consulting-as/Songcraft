'use client'

import { useEffect, useState } from 'react'
import { fetchPassiveParticipation } from '@/lib/playlistCommunities/client'
import type { ParticipationWidgetStats } from '@/lib/passiveParticipation/types'
import { t, useLang } from '@/lib/i18n'

export default function ParticipationWorkspaceWidget() {
  const tx = t[useLang()] as Record<string, string>
  const [stats, setStats] = useState<ParticipationWidgetStats | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchPassiveParticipation('widget')
        if (!cancelled && data?.widget) setStats(data.widget)
      } catch {
        /* ignore */
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!stats) return null

  return (
    <div className="card participation-workspace-widget">
      <h3 className="participation-workspace-widget__title">{tx.participationWidgetTitle}</h3>
      <p className="participation-workspace-widget__compliance">{tx.passiveParticipationComplianceShort}</p>
      <div className="participation-workspace-widget__grid">
        <div className="participation-workspace-widget__stat">
          <span className="participation-workspace-widget__value">{stats.streaks.dailyCurrent}</span>
          <span className="participation-workspace-widget__label">{tx.participationStreakDaily}</span>
          <span className="participation-workspace-widget__sub">{tx.participationStreakBest.replace('{n}', String(stats.streaks.dailyBest))}</span>
        </div>
        <div className="participation-workspace-widget__stat">
          <span className="participation-workspace-widget__value">{stats.streaks.weeklyCurrent}</span>
          <span className="participation-workspace-widget__label">{tx.participationStreakWeekly}</span>
          <span className="participation-workspace-widget__sub">{tx.participationStreakBest.replace('{n}', String(stats.streaks.weeklyBest))}</span>
        </div>
        <div className="participation-workspace-widget__stat">
          <span className="participation-workspace-widget__value">{stats.weekCompletionPercent}%</span>
          <span className="participation-workspace-widget__label">{tx.participationWeekCompletion}</span>
        </div>
        <div className="participation-workspace-widget__stat">
          <span className="participation-workspace-widget__value">{stats.avgCampaignCompletionPercent}%</span>
          <span className="participation-workspace-widget__label">{tx.participationCampaignCompletion}</span>
        </div>
        <div className="participation-workspace-widget__stat">
          <span className="participation-workspace-widget__value">{stats.pendingSuggestions}</span>
          <span className="participation-workspace-widget__label">{tx.participationPendingSuggestions}</span>
        </div>
        <div className="participation-workspace-widget__stat">
          <span className="participation-workspace-widget__value">{stats.pendingOwnerReviews}</span>
          <span className="participation-workspace-widget__label">{tx.participationPendingReviews}</span>
        </div>
      </div>
    </div>
  )
}
