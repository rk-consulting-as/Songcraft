'use client'

import Link from 'next/link'
import { communityFirstSteps } from '@/lib/v2/communityExplainer'

const TRACK_LABEL: Record<string, string> = {
  artist: 'Artist',
  supporter: 'Supporter',
  host: 'Host',
}

export default function V2CommunityStartHere() {
  return (
    <section id="v2-start-here" className="v2-section v2-start-here" aria-labelledby="v2-start-here-title">
      <div className="v2-start-here__head">
        <div className="v2-eyebrow">Start here</div>
        <h2 id="v2-start-here-title" style={{ margin: '6px 0 4px' }}>Pick the path that fits you</h2>
        <p className="v2-meta" style={{ margin: 0 }}>New here? Follow one of these to get going. You can mix and match later.</p>
      </div>

      <div className="v2-start-here__tracks">
        {communityFirstSteps.map((track) => (
          <div key={track.id} className="v2-card v2-track-card">
            <span className="v2-tag">{TRACK_LABEL[track.id]}</span>
            <h3 className="v2-track-card__headline">{track.headline}</h3>
            <p className="v2-meta">{track.intro}</p>
            <ol className="v2-track-card__steps">
              {track.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="v2-hero-actions">
              <Link href={track.primaryCta.href} className="v2-btn hot sm">{track.primaryCta.label}</Link>
              {track.secondaryCta && (
                <Link href={track.secondaryCta.href} className="v2-btn secondary sm">{track.secondaryCta.label}</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
