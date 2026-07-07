'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionCard from '@/components/v2/V2SessionCard'
import { useV2Toast } from '@/components/v2/V2Toast'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2Session } from '@/lib/v2/types'

type Props = {
  sessions: V2Session[]
  fromMock?: boolean
}

export default function SessionsIndexClient({ sessions, fromMock }: Props) {
  const { showToast } = useV2Toast()
  const [tab, setTab] = useState<'upcoming' | 'recent'>('upcoming')

  const filtered = useMemo(() => {
    if (tab === 'upcoming') return sessions.filter(s => s.status !== 'ended')
    return sessions
  }, [sessions, tab])

  return (
    <>
      <V2SectionHeader
        title="Listening Sessions"
        lead="Organized events where the community streams, reacts and gives feedback."
        action={
          <Link href={V2_ROUTES.host} className="v2-btn sm">+ Create Session</Link>
        }
      />
      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>
          Demo sessions — live queue state will connect via Aigent4U Stream Engine.
        </p>
      )}
      <div className="v2-hero-actions" style={{ marginBottom: 16 }}>
        <button type="button" className="v2-btn sm secondary" onClick={() => setTab('upcoming')}>Upcoming</button>
        <button type="button" className="v2-btn sm secondary" onClick={() => setTab('recent')}>Recent</button>
      </div>
      <div className="v2-grid cols-2">
        {filtered.map(session => (
          <V2SessionCard
            key={session.id}
            session={session}
            onJoin={() => showToast(`Joined ${session.title}`)}
          />
        ))}
      </div>
    </>
  )
}
