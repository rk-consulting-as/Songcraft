'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { communityWelcomeContent } from '@/lib/v2/communityExplainer'
import { isCommunityIntroSeen, markCommunityIntroSeen } from '@/lib/v2/onboardingStorage'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = {
  onHowItWorks?: () => void
}

export default function V2CommunityWelcomeModal({ onHowItWorks }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isCommunityIntroSeen()) setOpen(true)
  }, [])

  const dismiss = () => {
    markCommunityIntroSeen()
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="v2-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="v2-welcome-modal-title" onClick={dismiss}>
      <div className="v2-modal v2-welcome-modal" onClick={(e) => e.stopPropagation()}>
        <div className="v2-modal__head">
          <div>
            <div className="v2-eyebrow">Welcome</div>
            <h3 id="v2-welcome-modal-title" style={{ margin: '6px 0 0' }}>{communityWelcomeContent.title}</h3>
          </div>
          <button type="button" className="v2-btn secondary sm" onClick={dismiss} aria-label="Close">Close</button>
        </div>

        <div className="v2-modal__body">
          <p className="v2-meta">Here&apos;s what you can do here:</p>
          <ul className="v2-welcome-modal__list">
            {communityWelcomeContent.quickSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="v2-hero-actions" style={{ marginTop: 8 }}>
          <button type="button" className="v2-btn hot sm" onClick={dismiss}>Start exploring</button>
          {onHowItWorks && (
            <button
              type="button"
              className="v2-btn secondary sm"
              onClick={() => {
                markCommunityIntroSeen()
                setOpen(false)
                onHowItWorks()
              }}
            >
              How it works
            </button>
          )}
          <Link href={V2_ROUTES.host} className="v2-btn secondary sm" onClick={dismiss}>Open Host Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
