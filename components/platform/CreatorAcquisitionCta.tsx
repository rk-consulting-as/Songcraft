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

  if (variant === 'inline') {
    return (
      <div className="platform-cta platform-cta--inline" style={{ margin: '24px 0', padding: '14px 18px', borderRadius: 10, border: `1px solid ${accent}33`, background: `${accent}08` }}>
        <p style={{ margin: '0 0 10px', color: '#c8b8a0', fontSize: 14, lineHeight: 1.5 }}>{tx.platformCtaHeadline}</p>
        <Link href="/login" className="btn-gold" style={{ textDecoration: 'none', fontSize: 13, display: 'inline-block' }}>
          {tx.platformCtaStartFree} →
        </Link>
      </div>
    )
  }

  if (variant === 'footer') {
    return (
      <div className="platform-cta platform-cta--footer card" style={{ marginTop: 32, padding: 20, textAlign: 'center', borderColor: `${accent}28` }}>
        <h3 style={{ margin: '0 0 8px', color: accent, fontSize: 16, fontWeight: 600 }}>{tx.platformCtaTitle}</h3>
        <p style={{ margin: '0 0 14px', color: '#a09080', fontSize: 13, lineHeight: 1.55, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          {tx.platformCtaDesc}
        </p>
        <Link href="/login" className="btn-gold" style={{ textDecoration: 'none', display: 'inline-block' }}>
          {tx.platformCtaStartFree}
        </Link>
      </div>
    )
  }

  if (variant === 'hero') {
    return null
  }

  return (
    <div className="platform-cta platform-cta--card card" style={{ margin: '32px 0', padding: 24, borderColor: `${accent}35`, background: `linear-gradient(135deg, ${accent}0c 0%, rgba(10,10,15,0.4) 100%)` }}>
      <p style={{ margin: '0 0 6px', color: accent, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{tx.platformCtaEyebrow}</p>
      <h3 style={{ margin: '0 0 10px', color: '#e8e0d0', fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{tx.platformCtaTitle}</h3>
      <p style={{ margin: '0 0 16px', color: '#a09080', fontSize: 14, lineHeight: 1.55 }}>{tx.platformCtaDesc}</p>
      <ul style={{ margin: '0 0 18px', paddingLeft: 18, color: '#8a7a60', fontSize: 13, lineHeight: 1.6 }}>
        <li>{tx.platformCtaBulletWorkspace}</li>
        <li>{tx.platformCtaBulletCampaigns}</li>
        <li>{tx.platformCtaBulletFans}</li>
      </ul>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/login" className="btn-gold" style={{ textDecoration: 'none' }}>{tx.platformCtaStartFree}</Link>
        <Link href="/discover" className="btn-outline" style={{ textDecoration: 'none' }}>{tx.discoverEcosystemTitle}</Link>
      </div>
    </div>
  )
}
