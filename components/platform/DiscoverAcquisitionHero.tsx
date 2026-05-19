'use client'

import Link from 'next/link'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { t, useLang } from '@/lib/i18n'

export default function DiscoverAcquisitionHero() {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const accent = '#d4a843'

  return (
    <section className="discover-acquisition-hero card" style={{
      marginBottom: 32,
      padding: '32px 28px',
      textAlign: 'center',
      borderColor: `${accent}40`,
      background: `linear-gradient(160deg, ${accent}12 0%, rgba(18,7,30,0.5) 45%, rgba(10,15,10,0.6) 100%)`,
    }}>
      <p style={{ margin: '0 0 8px', color: accent, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>
        {BRAND_NAME} · {BRAND_TAGLINE}
      </p>
      <h1 style={{ margin: '0 0 12px', color: '#fff', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, lineHeight: 1.15 }}>
        {tx.discoverHeroTitle}
      </h1>
      <p style={{ margin: '0 auto 8px', color: '#c8b8a0', fontSize: 16, lineHeight: 1.55, maxWidth: 560 }}>
        {tx.discoverHeroSubtitle}
      </p>
      <p style={{ margin: '0 auto 24px', color: '#8a7a60', fontSize: 14, lineHeight: 1.5, maxWidth: 520 }}>
        {tx.discoverHeroWhy}
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/login" className="btn-gold" style={{ textDecoration: 'none', padding: '12px 24px', fontSize: 14 }}>
          {tx.platformCtaStartFree}
        </Link>
        <Link href="/playbook" className="btn-outline" style={{ textDecoration: 'none', padding: '12px 24px', fontSize: 14 }}>
          {tx.discoverHeroSeePlaybook}
        </Link>
      </div>
      <div className="discover-hero-pillars" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
        {[tx.discoverHeroPillarWorkspace, tx.discoverHeroPillarCampaigns, tx.discoverHeroPillarGrowth].map(label => (
          <span key={label} style={{
            fontSize: 11,
            letterSpacing: 0.5,
            padding: '6px 12px',
            borderRadius: 20,
            border: '1px solid rgba(180,140,80,0.25)',
            color: '#a09080',
          }}>
            {label}
          </span>
        ))}
      </div>
    </section>
  )
}
