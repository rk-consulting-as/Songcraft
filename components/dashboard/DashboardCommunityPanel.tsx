'use client'

import Link from 'next/link'
import type { CommandCenterSnapshot } from '@/lib/dashboard/types'
import { getIntelligentEmptyState } from '@/lib/dashboard/emptyStates'

type Props = {
  snapshot: CommandCenterSnapshot
  tx: Record<string, string>
  firstArtistId?: string
}

export default function DashboardCommunityPanel({ snapshot, tx, firstArtistId }: Props) {
  const p = snapshot.participation
  const m = snapshot.communityMomentum
  const hasItems =
    snapshot.pendingProofCount > 0 ||
    snapshot.pendingReviewCount > 0 ||
    snapshot.membersAwaitingApproval > 0 ||
    snapshot.activeCampaignCount > 0

  const showStreaks = m && (m.dailyStreak > 0 || m.weeklyStreak > 0 || m.proofStreak > 0)

  if (!hasItems && !showStreaks) {
    const empty = getIntelligentEmptyState('community', tx, snapshot.stage || 'starter', firstArtistId)
    return (
      <section id="campaign" className="dashboard-section dashboard-community-panel">
        <h2 className="dashboard-section__title">{tx.cmdCommunityTitle}</h2>
        <div className="card workspace-card workspace-glass">
          <p className="workspace-section-desc">{empty.message}</p>
          <Link href={empty.href} className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>
            {empty.cta} →
          </Link>
        </div>
      </section>
    )
  }

  const reviewHref = p?.reviewCampaignId ? `/playlist-campaigns/${p.reviewCampaignId}` : '/growth'
  const proofHref = p?.proofTodayCampaignId ? `/playlist-campaigns/${p.proofTodayCampaignId}` : '/growth'

  return (
    <section id="campaign" className="dashboard-section dashboard-community-panel">
      <h2 className="dashboard-section__title">{tx.cmdCommunityTitle}</h2>

      {showStreaks && m && (
        <div className="dashboard-community-momentum">
          {m.dailyStreak > 0 && (
            <div className="dashboard-community-streak card workspace-card">
              <span className="dashboard-community-streak__value">{m.dailyStreak}</span>
              <span className="dashboard-community-streak__label">{tx.participationStreakDaily}</span>
            </div>
          )}
          {m.proofStreak > 0 && (
            <div className="dashboard-community-streak card workspace-card">
              <span className="dashboard-community-streak__value">{m.proofStreak}</span>
              <span className="dashboard-community-streak__label">{tx.adaptProofStreak}</span>
            </div>
          )}
          {m.weeklyStreak > 0 && (
            <div className="dashboard-community-streak card workspace-card">
              <span className="dashboard-community-streak__value">{m.weeklyStreak}</span>
              <span className="dashboard-community-streak__label">{tx.participationStreakWeekly}</span>
            </div>
          )}
        </div>
      )}

      {hasItems && (
        <div className="dashboard-community-panel__grid">
          {snapshot.pendingProofCount > 0 && (
            <div className="dashboard-community-stat card workspace-card">
              <span className="dashboard-community-stat__value">{snapshot.pendingProofCount}</span>
              <span className="dashboard-community-stat__label">{tx.dashboardPendingSubmissions}</span>
              <Link href={proofHref} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', marginTop: 10 }}>
                {tx.dashboardSubmitProofToday}
              </Link>
            </div>
          )}
          {snapshot.pendingReviewCount > 0 && (
            <div className="dashboard-community-stat card workspace-card">
              <span className="dashboard-community-stat__value">{snapshot.pendingReviewCount}</span>
              <span className="dashboard-community-stat__label">{tx.dashboardProofsAwaitingReview}</span>
              <Link href={reviewHref} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', marginTop: 10 }}>
                {tx.dashboardReviewProofs}
              </Link>
            </div>
          )}
          {snapshot.membersAwaitingApproval > 0 && (
            <div className="dashboard-community-stat card workspace-card">
              <span className="dashboard-community-stat__value">{snapshot.membersAwaitingApproval}</span>
              <span className="dashboard-community-stat__label">{tx.cmdMembersAwaiting}</span>
              <Link href={reviewHref} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', marginTop: 10 }}>
                {tx.cmdApproveMembers}
              </Link>
            </div>
          )}
          {snapshot.activeCampaignCount > 0 && (
            <div className="dashboard-community-stat card workspace-card">
              <span className="dashboard-community-stat__value">{snapshot.activeCampaignCount}</span>
              <span className="dashboard-community-stat__label">{tx.cmdActiveCampaigns}</span>
              <Link href="/growth" className="btn-outline quick-action-btn" style={{ textDecoration: 'none', marginTop: 10 }}>
                {tx.cmdViewCampaign}
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
