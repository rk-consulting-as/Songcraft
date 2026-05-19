'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchParticipationSummary } from '@/lib/playlistCommunities/client'
import type { UserParticipationSummary } from '@/lib/playlistCommunities/participationSummary'
import { t, useLang } from '@/lib/i18n'

export default function CampaignActivityDashboardCard() {
  const tx = t[useLang()] as Record<string, string>
  const [summary, setSummary] = useState<UserParticipationSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchParticipationSummary()
        if (!cancelled && data?.summary) setSummary(data.summary)
      } catch {
        /* ignore */
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!summary) return null
  const hasActivity =
    summary.pendingReviews > 0 ||
    summary.myPendingSubmissions > 0 ||
    summary.joinedNeedingProofToday > 0 ||
    summary.activityProofSubmitCount > 0

  if (!hasActivity && summary.approvedActivityProofCount === 0) return null

  const reviewHref = summary.reviewCampaignId
    ? `/playlist-campaigns/${summary.reviewCampaignId}`
    : null
  const proofHref = summary.proofTodayCampaignId
    ? `/playlist-campaigns/${summary.proofTodayCampaignId}`
    : '/discover'

  return (
    <div className="card campaign-activity-dashboard-card">
      <h2 className="campaign-activity-dashboard-card__title">{tx.dashboardCampaignActivityTitle}</h2>
      <p className="campaign-activity-dashboard-card__intro">{tx.dashboardCampaignActivityIntro}</p>
      <div className="campaign-activity-dashboard-card__stats">
        <div className="campaign-activity-stat">
          <span className="campaign-activity-stat__value">{summary.myPendingSubmissions}</span>
          <span className="campaign-activity-stat__label">{tx.dashboardPendingSubmissions}</span>
        </div>
        <div className="campaign-activity-stat">
          <span className="campaign-activity-stat__value">{summary.pendingReviews}</span>
          <span className="campaign-activity-stat__label">{tx.dashboardProofsAwaitingReview}</span>
        </div>
        <div className="campaign-activity-stat">
          <span className="campaign-activity-stat__value">{summary.weekCompletionPercent}%</span>
          <span className="campaign-activity-stat__label">{tx.dashboardWeekCompletion}</span>
        </div>
      </div>
      <div className="campaign-activity-dashboard-card__actions">
        {summary.joinedNeedingProofToday > 0 && (
          <Link href={proofHref} className="btn-gold" style={{ textDecoration: 'none', fontSize: 12 }}>
            {tx.dashboardSubmitProofToday}
          </Link>
        )}
        {summary.pendingReviews > 0 && reviewHref && (
          <Link href={reviewHref} className="btn-outline" style={{ textDecoration: 'none', fontSize: 12 }}>
            {tx.dashboardReviewProofs}
          </Link>
        )}
        <Link href="/discover" className="btn-outline" style={{ textDecoration: 'none', fontSize: 12 }}>
          {tx.discoverEcosystemTitle} →
        </Link>
      </div>
    </div>
  )
}
