'use client'

import Link from 'next/link'
import { useState } from 'react'
import V2EmptyState from '@/components/v2/V2EmptyState'
import { v2ApiFetch } from '@/lib/v2/apiClient'
import { timeAgo } from '@/lib/v2/format'
import type { V2CommunityNotificationView } from '@/lib/v2/types'

type Props = {
  initialNotifications: V2CommunityNotificationView[]
  initialUnread: number
  /** When false, show only the latest few with an expand toggle (home block). */
  expanded?: boolean
  maxCollapsed?: number
}

export default function V2CommunityNotificationCenter({
  initialNotifications,
  initialUnread,
  expanded = false,
  maxCollapsed = 5,
}: Props) {
  const [items, setItems] = useState(initialNotifications)
  const [unread, setUnread] = useState(initialUnread)
  const [showAll, setShowAll] = useState(expanded)
  const [busy, setBusy] = useState(false)

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
    setUnread(prev => Math.max(0, prev - 1))
    try {
      await v2ApiFetch('/api/v2/community/notifications', { method: 'PATCH', body: JSON.stringify({ id }) })
    } catch {
      // optimistic; ignore
    }
  }

  const markAllRead = async () => {
    if (busy || unread === 0) return
    setBusy(true)
    setItems(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnread(0)
    try {
      await v2ApiFetch('/api/v2/community/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }) })
    } catch {
      // optimistic; ignore
    } finally {
      setBusy(false)
    }
  }

  const visible = showAll ? items : items.slice(0, maxCollapsed)

  return (
    <div className="v2-card v2-notif-center">
      <div className="v2-notif-center__head">
        <div className="v2-notif-center__title">
          <h4 style={{ margin: 0 }}>Notifications</h4>
          {unread > 0 && <span className="v2-notif-badge">{unread}</span>}
        </div>
        {unread > 0 && (
          <button type="button" className="v2-btn secondary sm" onClick={markAllRead} disabled={busy}>
            Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <V2EmptyState
          icon="🔔"
          title="You’re all caught up"
          description="Notifications about approvals, feedback, live sessions and badges will show up here."
        />
      ) : (
        <ul className="v2-notif-list">
          {visible.map(n => (
            <li key={n.id} className={`v2-notif-row tone-${n.tone}${n.isRead ? ' read' : ''}`}>
              <span className="v2-notif-row__icon" aria-hidden>{n.icon}</span>
              <div className="v2-notif-row__body">
                <p className="v2-notif-row__title">{n.title}</p>
                {n.body && <p className="v2-meta v2-notif-row__text">{n.body}</p>}
                <div className="v2-notif-row__meta">
                  <span className="v2-meta">{timeAgo(n.createdAt)}</span>
                  {n.cta && (
                    <Link href={n.cta.href} className="v2-btn secondary sm" onClick={() => markRead(n.id)}>
                      {n.cta.label}
                    </Link>
                  )}
                  {!n.isRead && (
                    <button type="button" className="v2-notif-row__mark" onClick={() => markRead(n.id)}>
                      Mark read
                    </button>
                  )}
                </div>
              </div>
              {!n.isRead && <span className="v2-notif-row__dot" aria-hidden />}
            </li>
          ))}
        </ul>
      )}

      {!expanded && items.length > maxCollapsed && (
        <button type="button" className="v2-btn secondary sm v2-notif-center__more" onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Show less' : `Show all (${items.length})`}
        </button>
      )}
    </div>
  )
}
