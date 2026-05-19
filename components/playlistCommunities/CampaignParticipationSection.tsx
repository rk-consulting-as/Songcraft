'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchCampaignParticipation } from '@/lib/playlistCommunities/client'
import type { ParticipationPayload } from '@/lib/playlistCommunities/activityTypes'
import type { ActivityProofLimits } from '@/lib/playlistCommunities/activityLimits'
import ParticipationBoard from './ParticipationBoard'
import ProofSubmissionPanel from './ProofSubmissionPanel'
import OwnerParticipationReview from './OwnerParticipationReview'
import { t, useLang } from '@/lib/i18n'

type Props = {
  campaignId: string
  isOwner: boolean
  isApprovedMember: boolean
  activeDaysPerWeek?: number | null
  campaignActive: boolean
}

export default function CampaignParticipationSection({
  campaignId,
  isOwner,
  isApprovedMember,
  activeDaysPerWeek,
  campaignActive,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [data, setData] = useState<
    (ParticipationPayload & { limits: ActivityProofLimits & { canUseAiReview: boolean }; role: string }) | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isOwner && !isApprovedMember) return
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchCampaignParticipation(campaignId)
      if (!payload) throw new Error('not_authenticated')
      setData(payload)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [campaignId, isOwner, isApprovedMember])

  useEffect(() => {
    load()
  }, [load])

  if (!isOwner && !isApprovedMember) return null
  if (loading) return <p style={{ color: '#8a7a60', fontSize: 13 }}>{tx.loading}</p>
  if (error === 'forbidden' || error === 'not_authenticated') return null
  if (error) return <p className="playlist-campaign-error">{error}</p>
  if (!data) return null

  return (
    <section className="public-section campaign-participation-section">
      <h2 className="public-section__title">{tx.participationBoardTitle}</h2>
      <p className="campaign-participation-intro">{tx.participationBoardIntro}</p>

      {isOwner && (
        <div className="participation-owner-stats">
          {data.pendingReviewCount > 0 && (
            <span className="participation-stat-chip participation-stat-chip--pending">
              {tx.ownerPendingReviews.replace('{n}', String(data.pendingReviewCount))}
            </span>
          )}
          {data.stats.membersNeedingAttention > 0 && (
            <span className="participation-stat-chip participation-stat-chip--attention">
              {tx.ownerMembersAttention.replace('{n}', String(data.stats.membersNeedingAttention))}
            </span>
          )}
          <span className="participation-stat-chip">
            {tx.ownerWeeklyApproved.replace('{n}', String(data.stats.totalApproved))}
          </span>
        </div>
      )}

      <ParticipationBoard board={data.board} weekDates={data.weekDates} />

      {isOwner && campaignActive && (
        <div className="participation-owner-review-block">
          <h3 className="public-section__title" style={{ fontSize: 16 }}>{tx.ownerReviewTitle}</h3>
          <OwnerParticipationReview
            campaignId={campaignId}
            logs={data.logs}
            limits={data.limits}
            onUpdated={load}
          />
        </div>
      )}

      {isApprovedMember && campaignActive && (
        <ProofSubmissionPanel
          campaignId={campaignId}
          myLogs={data.myLogs}
          limits={data.limits}
          activeDaysPerWeek={activeDaysPerWeek}
          onSubmitted={load}
        />
      )}
    </section>
  )
}
