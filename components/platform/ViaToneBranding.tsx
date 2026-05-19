'use client'

import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { shouldShowViaToneBranding } from '@/lib/platformGrowth/seo'
import type { ViaToneBrandingVariant } from '@/lib/platformGrowth/types'
import { t, useLang } from '@/lib/i18n'

type Props = {
  variant?: ViaToneBrandingVariant
  accent?: string
  href?: string
  className?: string
}

export default function ViaToneBranding({
  variant = 'footer',
  accent = '#d4a843',
  href = '/login',
  className = '',
}: Props) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>

  if (!shouldShowViaToneBranding()) return null

  const prefix =
    variant === 'badge'
      ? (tx.platformBuiltWith || 'Built with')
      : (tx.platformPoweredBy || 'Powered by')

  const sub = variant === 'footer' ? tx.platformCreateYourOwn : null

  const style: React.CSSProperties =
    variant === 'embed'
      ? { fontSize: 10, color: '#6a5a40', textAlign: 'center' as const }
      : variant === 'badge'
        ? { fontSize: 10, color: '#5a4a30', marginTop: 8 }
        : variant === 'minimal'
          ? { fontSize: 11, color: '#5a4a30', textAlign: 'center' as const }
          : { fontSize: 12, color: '#5a4a30', textAlign: 'center' as const, marginTop: variant === 'footer' ? 24 : 0 }

  return (
    <div className={`viatone-branding viatone-branding--${variant} ${className}`.trim()} style={style}>
      <Link
        href={href}
        onClick={e => e.stopPropagation()}
        style={{ color: '#5a4a30', textDecoration: 'none' }}
        className="viatone-branding__link"
      >
        {prefix}{' '}
        <span style={{ color: accent, fontWeight: 600 }}>{BRAND_NAME}</span>
      </Link>
      {sub && variant !== 'embed' && variant !== 'badge' && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#6a5a40', lineHeight: 1.4 }}>{sub}</p>
      )}
    </div>
  )
}
