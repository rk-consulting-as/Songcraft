'use client'

import { useMemo, useState } from 'react'
import V2CircleCard from '@/components/v2/V2CircleCard'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import { useV2Toast } from '@/components/v2/V2Toast'
import type { V2Circle } from '@/lib/v2/types'

type Props = {
  circles: V2Circle[]
  fromMock?: boolean
}

export default function CirclesIndexClient({ circles, fromMock }: Props) {
  const { showToast } = useV2Toast()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return circles
    return circles.filter(c =>
      `${c.name} ${c.description} ${c.tags.join(' ')}`.toLowerCase().includes(q),
    )
  }, [circles, q])

  return (
    <>
      <div className="v2-search" style={{ marginBottom: 16, maxWidth: 480 }}>
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Filter circles…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Filter circles"
        />
      </div>
      <V2SectionHeader
        title="Circles"
        lead="Genre-based communities with sessions, playlists and shared rules."
        action={
          <button type="button" className="v2-btn secondary sm" onClick={() => showToast('Create Circle — Host Pro')}>
            Create Circle
          </button>
        }
      />
      {fromMock && (
        <p className="v2-meta" style={{ marginBottom: 12 }}>Demo circles — create your first circle when Host Pro launches.</p>
      )}
      <div className="v2-grid cols-4" style={{ marginTop: 16 }}>
        {filtered.map(circle => (
          <V2CircleCard
            key={circle.id}
            circle={circle}
            onJoin={() => showToast(`Joined ${circle.name}`)}
          />
        ))}
      </div>
    </>
  )
}
