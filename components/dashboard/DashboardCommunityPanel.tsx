'use client'

import Link from 'next/link'
import type { CommandCenterSnapshot } from '@/lib/dashboard/types'

type Props = {
  snapshot: CommandCenterSnapshot
  tx: Record<string, string>
}

export default function DashboardCommunityPanel({ snapshot, tx }: Props) {
  const p = snapshot.participation
  const hasItems =
    snapshot.pendingProofCount > 0 ||
    snapshot.pendingReviewCount > 0 ||
    snapshot.membersAwaitingApproval > 0 ||
    snapshot.activeCampaignCount > 0

  if (!hasItems) {
    return (
      <section id="campaign" className="dashboard-section dashboard-community-panel">
        <h2 className="dashboard-section__title">{tx.cmdCommunityTitle}</h2>
        <div className="card workspace-card workspace-glass">
          <p className="workspace-section-desc">{tx.dashboardCommunitiesEmpty}</p>
          <Link href="/discover/campaigns" className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>
            {tx.cmdGrowthJoinCampaign} →
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
    </section>
  )
}
