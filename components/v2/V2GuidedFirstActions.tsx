'use client'

import Link from 'next/link'
import { V2_ROUTES } from '@/lib/v2/routes'

type Props = {
  artistCount: number
  songCount: number
  circlesJoined: number
  submissionsCount: number
  sessionsJoined: number
  firstCircleSlug?: string
  firstSessionId?: string
}

type Step = {
  id: string
  label: string
  done: boolean
  href: string
  hint: string
}

export default function V2GuidedFirstActions({
  artistCount,
  songCount,
  circlesJoined,
  submissionsCount,
  sessionsJoined,
  firstCircleSlug,
  firstSessionId,
}: Props) {
  const steps: Step[] = [
    {
      id: 'artist',
      label: 'Create artist',
      done: artistCount > 0,
      href: V2_ROUTES.legacyStudio,
      hint: 'Set up your artist profile in Legacy Studio.',
    },
    {
      id: 'song',
      label: 'Add song',
      done: songCount > 0,
      href: V2_ROUTES.legacyStudio,
      hint: 'Upload or import a track you can share.',
    },
    {
      id: 'circle',
      label: 'Join first circle',
      done: circlesJoined > 0,
      href: firstCircleSlug ? V2_ROUTES.circle(firstCircleSlug) : V2_ROUTES.circles,
      hint: 'Pick a circle that fits your genre.',
    },
    {
      id: 'submit',
      label: 'Submit song for feedback',
      done: submissionsCount > 0,
      href: firstCircleSlug ? V2_ROUTES.circle(firstCircleSlug) : V2_ROUTES.circles,
      hint: 'Share a track with a circle for listener notes.',
    },
    {
      id: 'session',
      label: 'Join first session',
      done: sessionsJoined > 0,
      href: firstSessionId ? V2_ROUTES.session(firstSessionId) : V2_ROUTES.sessions,
      hint: 'Join a listening room and confirm participation.',
    },
  ]

  const completed = steps.filter(s => s.done).length
  if (completed >= steps.length) return null

  return (
    <section className="v2-section">
      <div className="v2-card v2-guided-actions">
        <div className="v2-guided-actions__head">
          <h4 style={{ margin: 0 }}>Your first steps</h4>
          <span className="v2-meta">{completed} / {steps.length} done</span>
        </div>
        <p className="v2-meta" style={{ marginTop: 8 }}>
          A quick path from catalog to community participation.
        </p>
        <ul className="v2-checklist">
          {steps.map(step => (
            <li key={step.id} className={step.done ? 'done' : undefined}>
              <span className="v2-checklist__mark" aria-hidden>{step.done ? '✓' : '○'}</span>
              <div>
                <Link href={step.href} className={step.done ? 'v2-meta' : undefined}>{step.label}</Link>
                {!step.done && <span className="v2-meta">{step.hint}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
