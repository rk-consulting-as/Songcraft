'use client'

import { useEffect, useState } from 'react'
import { fetchPassiveParticipation } from '@/lib/playlistCommunities/client'
import type { PassiveParticipationDigest } from '@/lib/passiveParticipation/types'
import { t, useLang } from '@/lib/i18n'

export default function WeeklyParticipationDigestCard() {
  const tx = t[useLang()] as Record<string, string>
  const [digest, setDigest] = useState<PassiveParticipationDigest | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchPassiveParticipation('digest')
        if (!cancelled && data?.digest) setDigest(data.digest)
      } catch {
        /* ignore */
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!digest) return null
  const hasData =
    digest.sessionsDetected > 0 ||
    digest.proofsApproved > 0 ||
    digest.campaignsParticipated > 0

  if (!hasData) return null

  return (
    <div className="card weekly-participation-digest">
      <h3 className="weekly-participation-digest__title">{tx.weeklyDigestTitle}</h3>
      <p className="weekly-participation-digest__range">
        {digest.weekStart} → {digest.weekEnd}
      </p>
      <ul className="weekly-participation-digest__stats">
        <li>{tx.weeklyDigestSessions.replace('{n}', String(digest.sessionsDetected))}</li>
        <li>{tx.weeklyDigestApproved.replace('{n}', String(digest.proofsApproved))}</li>
        <li>{tx.weeklyDigestCampaigns.replace('{n}', String(digest.campaignsParticipated))}</li>
        <li>{tx.weeklyDigestSuggestionsApproved.replace('{n}', String(digest.suggestionsApproved))}</li>
      </ul>
      <p className="weekly-participation-digest__reputation">{tx[digest.reputationNote]}</p>
      <p className="weekly-participation-digest__compliance">{tx.passiveParticipationComplianceShort}</p>
    </div>
  )
}
