'use client'

import Link from 'next/link'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { useV2Toast } from '@/components/v2/V2Toast'
import { V2_PRICING } from '@/lib/v2/mockData'
import { V2_ROUTES } from '@/lib/v2/routes'

export default function PricingPage() {
  const { showToast } = useV2Toast()

  return (
    <>
      <V2SectionHeader
        title="Simple monetization"
        lead="Free to participate. Pro for artists who want to grow, Host Pro for curators who drive sessions."
      />
      <div className="v2-grid cols-3" style={{ marginTop: 16 }}>
        {V2_PRICING.map(plan => (
          <article key={plan.id} className={`v2-card v2-pricing-card${plan.featured ? ' featured' : ''}`}>
            <h3>{plan.name}</h3>
            <div className="v2-price">{plan.priceLabel.replace(' /mo', '')} <small>/mo</small></div>
            <p className="v2-meta">{plan.description}</p>
            <ul className="v2-features">
              {plan.features.map(f => <li key={f}>{f}</li>)}
            </ul>
            {plan.id === 'pro_artist' ? (
              <Link href="/settings/billing" className="v2-btn hot">{plan.cta}</Link>
            ) : plan.id === 'host_pro' ? (
              <Link href={V2_ROUTES.host} className="v2-btn secondary">{plan.cta}</Link>
            ) : (
              <button
                type="button"
                className={`v2-btn${plan.featured ? ' hot' : ' secondary'}`}
                onClick={() => showToast(`${plan.name} — Stripe products TODO`)}
              >
                {plan.cta}
              </button>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
