'use client'

import { useEffect } from 'react'
import { communityHowItWorksSections } from '@/lib/v2/communityExplainer'
import V2CommunityGlossary from '@/components/v2/V2CommunityGlossary'

type Props = {
  open: boolean
  onClose: () => void
}

export default function V2CommunityHowItWorks({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="v2-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="v2-hiw-title" onClick={onClose}>
      <div className="v2-modal v2-hiw-modal" onClick={(e) => e.stopPropagation()}>
        <div className="v2-modal__head">
          <div>
            <div className="v2-eyebrow">Community</div>
            <h3 id="v2-hiw-title" style={{ margin: '6px 0 0' }}>How ViaTone Community works</h3>
          </div>
          <button type="button" className="v2-btn secondary sm" onClick={onClose} aria-label="Close">Close</button>
        </div>

        <div className="v2-modal__body">
          <ol className="v2-hiw-steps">
            {communityHowItWorksSections.map((section, index) => (
              <li key={section.id} className="v2-hiw-step">
                <span className="v2-hiw-step__num" aria-hidden>{index + 1}</span>
                <div>
                  <strong>{section.title}</strong>
                  <ul className="v2-hiw-step__points">
                    {section.points.map((p) => (
                      <li key={p} className="v2-meta">{p}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          <V2CommunityGlossary />
        </div>
      </div>
    </div>
  )
}
