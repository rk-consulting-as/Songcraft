'use client'

import Link from 'next/link'
import { useState } from 'react'
import { t, useLang, type Lang } from '@/lib/i18n'

export default function UpgradePrompt({
  title,
  description,
  compact = false,
}: {
  title?: string
  description?: string
  compact?: boolean
}) {
  const [lang] = useState<Lang>(() => useLang())
  const tx = t[lang]

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(212,168,67,0.10), rgba(112,144,208,0.08))',
      border: '1px solid rgba(212,168,67,0.28)',
      borderRadius: 8,
      padding: compact ? 10 : 14,
      marginTop: compact ? 8 : 12,
    }}>
      <div style={{ color: '#d4a843', fontSize: compact ? 12 : 13, fontWeight: 600, marginBottom: 4 }}>
        {title || tx.upgradeSoftTitle}
      </div>
      <div style={{ color: '#8a7a60', fontSize: 12, lineHeight: 1.5 }}>
        {description || tx.upgradeSoftDesc}
      </div>
      <Link href="/settings/billing" style={{ color: '#d4a843', fontSize: 12, textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>
        {tx.upgradeSoftCta} →
      </Link>
    </div>
  )
}
