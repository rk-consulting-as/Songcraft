'use client'

import { t, useLang } from '@/lib/i18n'

export default function ActivityProofDisclaimer({ compact }: { compact?: boolean }) {
  const tx = t[useLang()] as Record<string, string>
  return (
    <p className={`activity-proof-disclaimer${compact ? ' activity-proof-disclaimer--compact' : ''}`} role="note">
      {tx.activityProofSafetyDisclaimer}
    </p>
  )
}
