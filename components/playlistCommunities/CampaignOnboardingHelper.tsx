'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchCampaignParticipation } from '@/lib/playlistCommunities/client'
import { t, useLang } from '@/lib/i18n'

type Props = {
  campaignId: string
  isOwner: boolean
  isApprovedMember: boolean
  hasRules: boolean
  hasSpotifyOnSong: boolean
  inviteCopied: boolean
  joinSongId?: string | null
}

const rulesKey = (id: string) => `viatone-campaign-rules-read-${id}`

export default function CampaignOnboardingHelper({
  campaignId,
  isOwner,
  isApprovedMember,
  hasRules,
  hasSpotifyOnSong,
  inviteCopied,
  joinSongId,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const [rulesRead, setRulesRead] = useState(false)
  const [hasProof, setHasProof] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setRulesRead(localStorage.getItem(rulesKey(campaignId)) === '1')
  }, [campaignId])

  const markRulesRead = () => {
    localStorage.setItem(rulesKey(campaignId), '1')
    setRulesRead(true)
  }

  const loadProof = useCallback(async () => {
    if (!isApprovedMember && !isOwner) return
    try {
      const data = await fetchCampaignParticipation(campaignId)
      if (!data) return
      const mine = (data.myLogs || []).some(l => l.status === 'approved' || l.status === 'pending')
      setHasProof(mine)
    } catch {
      /* ignore */
    }
  }, [campaignId, isApprovedMember, isOwner])

  useEffect(() => {
    loadProof()
  }, [loadProof])

  const steps = useMemo(() => {
    const list: { key: string; label: string; done: boolean; action?: React.ReactNode }[] = []
    if (hasRules) {
      list.push({
        key: 'rules',
        label: tx.campaignOnboardingReadRules,
        done: rulesRead,
        action: !rulesRead ? (
          <button type="button" className="btn-outline" style={{ fontSize: 11 }} onClick={markRulesRead}>
            {tx.campaignOnboardingMarkRead}
          </button>
        ) : null,
      })
    }
    if (isApprovedMember || (!isOwner && joinSongId)) {
      list.push({
        key: 'spotify',
        label: tx.campaignOnboardingAddSpotify,
        done: hasSpotifyOnSong,
        action: !hasSpotifyOnSong && joinSongId ? (
          <Link href={`/song/${joinSongId}#media`} className="btn-outline" style={{ fontSize: 11, textDecoration: 'none' }}>
            {tx.campaignOnboardingOpenSong}
          </Link>
        ) : null,
      })
      list.push({
        key: 'proof',
        label: tx.campaignOnboardingSubmitProof,
        done: hasProof,
        action: !hasProof ? (
          <a href="#participation" className="btn-outline" style={{ fontSize: 11, textDecoration: 'none' }}>
            {tx.campaignOnboardingGoProof}
          </a>
        ) : null,
      })
    }
    if (isOwner) {
      list.push({
        key: 'invite',
        label: tx.campaignOnboardingInvite,
        done: inviteCopied,
      })
    }
    return list
  }, [hasRules, rulesRead, hasSpotifyOnSong, hasProof, inviteCopied, isOwner, isApprovedMember, joinSongId, tx])

  if (steps.length === 0) return null
  const doneCount = steps.filter(s => s.done).length
  if (doneCount === steps.length) return null

  return (
    <section className="card campaign-onboarding-helper">
      <h3 className="campaign-onboarding-helper__title">{tx.campaignOnboardingTitle}</h3>
      <p className="campaign-onboarding-helper__progress">
        {tx.campaignOnboardingProgress.replace('{done}', String(doneCount)).replace('{total}', String(steps.length))}
      </p>
      <ul className="campaign-onboarding-helper__list">
        {steps.map(s => (
          <li key={s.key} className={`campaign-onboarding-helper__step${s.done ? ' is-done' : ''}`}>
            <span className="campaign-onboarding-helper__check">{s.done ? '✓' : '○'}</span>
            <span className="campaign-onboarding-helper__label">{s.label}</span>
            {s.action}
          </li>
        ))}
      </ul>
    </section>
  )
}
