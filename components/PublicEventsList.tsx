'use client'

import { useState } from 'react'
import { t, useLang, type Lang } from '@/lib/i18n'

export type PublicArtistEvent = {
  id: string
  title: string
  date: string
  venue?: string | null
  city?: string | null
  country?: string | null
  ticket_url?: string | null
  status: string
}

export default function PublicEventsList({
  events,
  accent = '#d4a843',
}: {
  events: PublicArtistEvent[]
  accent?: string
}) {
  const [lang] = useState<Lang>(() => useLang())
  const tx = t[lang]

  if (!events.length) return null

  const formatDate = (date: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'no' ? 'nb-NO' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(`${date}T12:00:00`))
    } catch {
      return date
    }
  }

  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 13, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>
        {tx.eventsPublicTitle}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map(event => {
          const location = [event.venue, event.city, event.country].filter(Boolean).join(' · ')
          const soldOut = event.status === 'sold_out'
          return (
            <div
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 240px' }}>
                <div style={{ color: accent, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  {formatDate(event.date)}
                </div>
                <div style={{ color: '#e8e0d0', fontSize: 15, fontWeight: 600 }}>{event.title}</div>
                {location && <div style={{ color: '#8a7a60', fontSize: 12, marginTop: 3 }}>{location}</div>}
              </div>
              {soldOut ? (
                <span style={{ color: '#c05050', border: '1px solid rgba(200,80,80,0.35)', borderRadius: 16, padding: '5px 12px', fontSize: 12 }}>
                  {tx.eventStatusSoldOut}
                </span>
              ) : event.ticket_url ? (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0a0a0f', background: accent, borderRadius: 16, padding: '7px 14px', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}
                >
                  {tx.eventTickets}
                </a>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
