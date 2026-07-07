'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useV2Toast } from '@/components/v2/V2Toast'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import { V2_ROUTES } from '@/lib/v2/routes'
import type { V2HostCapabilities } from '@/lib/v2/types'

type Props = {
  access: V2HostCapabilities
  circles: { id: string; name: string }[]
}

export default function V2HostCreatePanel({ access, circles }: Props) {
  const router = useRouter()
  const { showToast } = useV2Toast()
  const [busy, setBusy] = useState(false)
  const [circleName, setCircleName] = useState('')
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionCircleId, setSessionCircleId] = useState(circles[0]?.id || '')
  const [roomName, setRoomName] = useState('')
  const [roomCircleId, setRoomCircleId] = useState(circles[0]?.id || '')

  const blocked = !access.canCreateCircle && access.showUpgradePrompt

  const create = async (path: string, body: Record<string, unknown>, label: string) => {
    if (blocked) {
      showToast('Host Pro required — see pricing')
      return
    }
    setBusy(true)
    try {
      await v2ApiFetch(path, { method: 'POST', body: JSON.stringify(body) })
      showToast(`${label} created`)
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      if (msg.includes('host_pro')) showToast('Upgrade to Host Pro to create')
      else showToast(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="v2-section">
      <h4 style={{ margin: '0 0 8px' }}>Create community resources</h4>
      {access.showUpgradePrompt && (
        <div className="v2-card v2-host-upgrade" style={{ marginBottom: 16 }}>
          <p className="v2-meta" style={{ marginTop: 0 }}>
            {access.softGating
              ? 'Host Pro billing is in beta — you can create while plans finalize. Upgrade for full curator tools.'
              : 'Create circles, sessions and playlist rooms with Host Pro.'}
          </p>
          <Link href={V2_ROUTES.pricing} className="v2-btn hot sm">View Host Pro</Link>
        </div>
      )}

      <div className="v2-grid cols-3" style={{ gap: 16 }}>
        <div className="v2-card">
          <h5 style={{ margin: '0 0 8px' }}>Circle</h5>
          <input className="v2-input" placeholder="Circle name" value={circleName} onChange={e => setCircleName(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
          <button type="button" className="v2-btn secondary sm" disabled={busy || !circleName.trim()} onClick={() => create('/api/v2/community/host/circles', { name: circleName }, 'Circle')}>
            Create circle
          </button>
        </div>
        <div className="v2-card">
          <h5 style={{ margin: '0 0 8px' }}>Session</h5>
          <input className="v2-input" placeholder="Session title" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
          {circles.length > 0 && (
            <select className="v2-input" value={sessionCircleId} onChange={e => setSessionCircleId(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
              {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            type="button"
            className="v2-btn secondary sm"
            disabled={busy || !sessionTitle.trim()}
            onClick={() => create('/api/v2/community/host/sessions', { title: sessionTitle, circle_id: sessionCircleId || undefined }, 'Session')}
          >
            Create session
          </button>
        </div>
        <div className="v2-card">
          <h5 style={{ margin: '0 0 8px' }}>Playlist room</h5>
          <input className="v2-input" placeholder="Room name" value={roomName} onChange={e => setRoomName(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
          {circles.length > 0 && (
            <select className="v2-input" value={roomCircleId} onChange={e => setRoomCircleId(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
              {circles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            type="button"
            className="v2-btn secondary sm"
            disabled={busy || !roomName.trim()}
            onClick={() => create('/api/v2/community/host/playlist-rooms', { name: roomName, circle_id: roomCircleId || undefined }, 'Playlist room')}
          >
            Create room
          </button>
        </div>
      </div>
    </section>
  )
}
