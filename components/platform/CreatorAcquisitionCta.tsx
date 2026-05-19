'use client'

import Link from 'next/link'
import type { CreatorCtaVariant } from '@/lib/platformGrowth/types'
import { t, useLang } from '@/lib/i18n'

type Props = {
  variant?: CreatorCtaVariant
  accent?: string
}

export default function CreatorAcquisitionCta({ variant = 'card', accent = '#d4a843' }: Props) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const style = { ['--pub-accent' as string]: accent, ['--cta-accent' as string]: accent }

  if (variant === 'inline') {
    return (
      <div className="platform-cta platform-cta--inline" style={style}>
        <p className="platform-cta__headline">{tx.platformCtaHeadline}</p>
        <Link href="/login" className="btn-gold" style={{ textDecoration: 'none', fontSize: 13 }}>
          {tx.platformCtaStartFree} →
        </Link>
      </div>
    )
  }

  if (variant === 'footer') {
    return (
      <div className="platform-cta platform-cta--footer card" style={style}>
        <h3 className="platform-cta__title" style={{ color: accent }}>{tx.platformCtaTitle}</h3>
        <p className="platform-cta__desc">{tx.platformCtaDesc}</p>
        <div className="platform-cta__actions">
          <Link href="/login" className="btn-gold" style={{ textDecoration: 'none' }}>
            {tx.platformCtaStartFree}
          </Link>
        </div>
      </div>
    )
  }

  if (variant === 'hero') {
    return null
  }

  return (
    <div className="platform-cta platform-cta--card card" style={style}>
      <p className="platform-cta__eyebrow">{tx.platformCtaEyebrow}</p>
      <h3 className="platform-cta__title">{tx.platformCtaTitle}</h3>
      <p className="platform-cta__desc">{tx.platformCtaDesc}</p>
      <ul className="platform-cta__bullets">
        <li>{tx.platformCtaBulletWorkspace}</li>
        <li>{tx.platformCtaBulletCampaigns}</li>
        <li>{tx.platformCtaBulletFans}</li>
      </ul>
      <div className="platform-cta__actions">
        <Link href="/login" className="btn-gold" style={{ textDecoration: 'none' }}>{tx.platformCtaStartFree}</Link>
        <Link href="/discover" className="btn-outline" style={{ textDecoration: 'none' }}>{tx.discoverEcosystemTitle}</Link>
      </div>
    </div>
  )
}
