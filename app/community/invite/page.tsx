import Link from 'next/link'
import type { Metadata } from 'next'
import V2CommunityBenefits from '@/components/v2/V2CommunityBenefits'
import V2CommunityAnalyticsTracker from '@/components/v2/V2CommunityAnalyticsTracker'
import V2PublicAuthCta from '@/components/v2/V2PublicAuthCta'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { buildLoginUrl, buildSignupUrl } from '@/lib/v2/authReturn'
import { V2_ROUTES } from '@/lib/v2/routes'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Join ViaTone Community Beta',
  description: 'Closed beta invite for ViaTone 2.0 Community — circles, sessions and playlist rooms.',
}

type Props = {
  searchParams: Record<string, string | string[] | undefined>
}

function pick(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined
}

export default function CommunityInvitePage({ searchParams }: Props) {
  const ref = pick(searchParams.ref) || 'beta'
  const entity = pick(searchParams.entity)
  const entityId = pick(searchParams.id)
  const slug = pick(searchParams.slug)

  let returnPath: string = V2_ROUTES.explore
  if (entity === 'circle' && slug) returnPath = V2_ROUTES.circle(slug)
  else if (entity === 'session' && entityId) returnPath = V2_ROUTES.session(entityId)
  else if (entity === 'room' && slug) returnPath = V2_ROUTES.playlistRoom(slug)
  else if (entity === 'host' && entityId) returnPath = V2_ROUTES.hostProfile(entityId)

  const returnWithRef = `${returnPath}${returnPath.includes('?') ? '&' : '?'}ref=${encodeURIComponent(ref)}`

  return (
    <>
      <V2CommunityAnalyticsTracker entityType="explore" />
      <section className="v2-section" style={{ marginTop: 0 }}>
        <div className="v2-eyebrow">Closed beta · English only</div>
        <h1 style={{ margin: '8px 0 12px' }}>You&apos;re invited to ViaTone Community</h1>
        <p className="v2-meta" style={{ fontSize: 16, maxWidth: 560 }}>
          Listen together, submit songs, get feedback, and grow with independent artists and curators.
          This beta is for 5–10 early testers — your feedback shapes the product.
        </p>
        <div className="v2-hero-actions v2-hero-cta-row" style={{ marginTop: 16 }}>
          <Link href={buildSignupUrl(returnWithRef)} className="v2-btn hot">Create free account</Link>
          <Link href={buildLoginUrl(returnWithRef)} className="v2-btn secondary">Sign in</Link>
          <Link href={`${V2_ROUTES.explore}?ref=${encodeURIComponent(ref)}`} className="v2-btn secondary sm">Browse first</Link>
        </div>
        {ref && ref !== 'beta' && (
          <p className="v2-meta" style={{ marginTop: 12 }}>Invite code: <span className="v2-tag">{ref}</span></p>
        )}
      </section>

      <V2CommunityBenefits />

      <section className="v2-section">
        <V2SectionHeader title="What to try first" lead="A short path for beta testers." />
        <div className="v2-card">
          <ol className="v2-meta" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Explore public circles and upcoming sessions</li>
            <li>Join a circle and RSVP to a session</li>
            <li>Connect a song from Legacy Studio and submit for feedback</li>
            <li>Follow a host or save a session to track activity</li>
            <li>Use the feedback button (bottom-right) to report bugs or ideas</li>
          </ol>
        </div>
      </section>

      <section className="v2-section">
        <V2PublicAuthCta
          returnPath={returnWithRef}
          title="Ready to join?"
          description="After signup you'll return to the page you were invited to."
          primaryLabel="Sign up free"
          secondaryLabel="Sign in"
        />
      </section>
    </>
  )
}
