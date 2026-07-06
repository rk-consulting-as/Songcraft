'use client'

import { useMemo, useState } from 'react'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import V2SessionCard from '@/components/v2/V2SessionCard'
import { useV2Toast } from '@/components/v2/V2Toast'
import { V2_SESSIONS } from '@/lib/v2/mockData'

export default function SessionsIndexPage() {
  const { showToast } = useV2Toast()
  const [tab, setTab] = useState<'upcoming' | 'recent'>('upcoming')

  const sessions = useMemo(() => {
    if (tab === 'upcoming') {
      return V2_SESSIONS.filter(s => s.status !== 'ended')
    }
    return V2_SESSIONS
  }, [tab])

  return (
    <>
      <V2SectionHeader
        title="Listening Sessions"
        lead="Organized events where the community streams, reacts and gives feedback."
        action={
          <button type="button" className="v2-btn sm" onClick={() => showToast('Create Session — Host Pro')}>
            + Create Session
          </button>
        }
      />
      <div className="v2-hero-actions" style={{ marginBottom: 16 }}>
        <button type="button" className={`v2-btn sm secondary${tab === 'upcoming' ? '' : ''}`} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button type="button" className="v2-btn sm secondary" onClick={() => setTab('recent')}>Recent</button>
      </div>
      <div className="v2-grid cols-2">
        {sessions.map(session => (
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
