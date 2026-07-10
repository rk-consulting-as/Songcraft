import Link from 'next/link'
import { buildLoginUrl, buildSignupUrl } from '@/lib/v2/authReturn'

type Props = {
  returnPath: string
  title?: string
  description?: string
  primaryLabel?: string
  secondaryLabel?: string
  compact?: boolean
}

export default function V2PublicAuthCta({
  returnPath,
  title = 'Join ViaTone to participate',
  description = 'Sign in or create a free account to RSVP, join circles, and submit your music.',
  primaryLabel = 'Sign in',
  secondaryLabel = 'Create account',
  compact,
}: Props) {
  return (
    <div className={`v2-card v2-public-auth-cta${compact ? ' compact' : ''}`}>
      <h4 style={{ margin: '0 0 6px' }}>{title}</h4>
      {!compact && <p className="v2-meta" style={{ margin: '0 0 12px' }}>{description}</p>}
      <div className="v2-hero-actions">
        <Link href={buildLoginUrl(returnPath)} className="v2-btn hot sm">{primaryLabel}</Link>
        <Link href={buildSignupUrl(returnPath)} className="v2-btn secondary sm">{secondaryLabel}</Link>
      </div>
    </div>
  )
}
