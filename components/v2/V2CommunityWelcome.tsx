'use client'

import Link from 'next/link'
import { communityExplainerCards, communityWelcomeContent } from '@/lib/v2/communityExplainer'

type Props = {
  onHowItWorks?: () => void
  onStartHere?: () => void
}

export default function V2CommunityWelcome({ onHowItWorks, onStartHere }: Props) {
  return (
    <section className="v2-section v2-welcome" aria-labelledby="v2-welcome-title">
      <div className="v2-welcome__head">
        <div className="v2-eyebrow">Community</div>
        <h2 id="v2-welcome-title" className="v2-welcome__title">{communityWelcomeContent.title}</h2>
        <p className="v2-welcome__intro">{communityWelcomeContent.intro}</p>
        <div className="v2-hero-actions">
          {onHowItWorks && (
            <button type="button" className="v2-btn secondary sm" onClick={onHowItWorks}>How it works</button>
          )}
          {onStartHere && (
            <button type="button" className="v2-btn hot sm" onClick={onStartHere}>Start here</button>
          )}
        </div>
      </div>

      <div className="v2-welcome__cards">
        {communityExplainerCards.map((card) => (
          <div key={card.id} className="v2-card v2-welcome-card">
            <h3 className="v2-welcome-card__headline">{card.headline}</h3>
            <p className="v2-meta v2-welcome-card__desc">{card.description}</p>
            {card.examples && (
              <div className="v2-welcome-card__examples">
                {card.examples.map((ex) => (
                  <span key={ex} className="v2-tag">{ex}</span>
                ))}
              </div>
            )}
            <Link href={card.href} className="v2-btn secondary sm v2-welcome-card__cta">{card.cta}</Link>
          </div>
        ))}
      </div>
    </section>
  )
}
