'use client'

import { communityBenefits } from '@/lib/v2/communityExplainer'

export default function V2CommunityBenefits() {
  return (
    <section className="v2-section v2-benefits" aria-labelledby="v2-benefits-title">
      <div className="v2-card v2-benefits__card">
        <h2 id="v2-benefits-title" className="v2-benefits__title">{communityBenefits.title}</h2>
        <ul className="v2-benefits__list">
          {communityBenefits.points.map((point) => (
            <li key={point}>
              <span className="v2-benefits__mark" aria-hidden>♪</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
