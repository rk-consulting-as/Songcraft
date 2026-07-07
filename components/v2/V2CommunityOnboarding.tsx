'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { dismissCommunityOnboarding, isCommunityOnboardingDismissed } from '@/lib/v2/onboardingStorage'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = {
  loggedIn?: boolean
}

const STEPS = [
  { title: 'Join circles', body: 'Find rooms that match your sound and genre.' },
  { title: 'Submit songs', body: 'Share tracks from your catalog for feedback and sessions.' },
  { title: 'Join sessions', body: 'Listen together and confirm your participation.' },
  { title: 'Give feedback', body: 'Help creators with ratings, reactions and notes.' },
  { title: 'Become a host', body: 'Run circles and sessions with Host Pro curator tools.' },
]

export default function V2CommunityOnboarding({ loggedIn }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!isCommunityOnboardingDismissed())
  }, [])

  if (!visible) return null

  const dismiss = () => {
    dismissCommunityOnboarding()
    setVisible(false)
  }

  return (
    <section className="v2-section v2-onboarding" style={{ marginTop: 0 }}>
      <div className="v2-card v2-onboarding-card">
        <div className="v2-onboarding-card__head">
          <div>
            <div className="v2-eyebrow">Welcome to ViaTone Community</div>
            <h3 style={{ margin: '6px 0 8px' }}>How community listening works</h3>
            <p className="v2-meta" style={{ margin: 0 }}>
              Participation and feedback — not verified streams. Take it step by step.
            </p>
          </div>
          <button type="button" className="v2-btn secondary sm" onClick={dismiss}>Dismiss</button>
        </div>
        <div className="v2-onboarding-steps">
          {STEPS.map(step => (
            <div key={step.title} className="v2-onboarding-step">
              <strong>{step.title}</strong>
              <span className="v2-meta">{step.body}</span>
            </div>
          ))}
        </div>
        <div className="v2-hero-actions" style={{ marginTop: 16 }}>
          {loggedIn ? (
            <>
              <Link href={V2_ROUTES.circles} className="v2-btn hot sm">Explore circles</Link>
              <Link href={V2_ROUTES.sessions} className="v2-btn secondary sm">Browse sessions</Link>
            </>
          ) : (
            <Link href="/login" className="v2-btn hot sm">Log in to get started</Link>
          )}
          <button type="button" className="v2-btn secondary sm" onClick={dismiss}>Got it</button>
        </div>
      </div>
    </section>
  )
}
