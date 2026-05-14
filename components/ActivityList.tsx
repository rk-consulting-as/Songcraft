'use client'
import Link from 'next/link'
import Avatar from './Avatar'

export type ActivityEntry = {
  id: string
  actor_id: string
  kind: string
  subject_id: string | null
  subject_type: string | null
  subject_label: string | null
  metadata: any
  created_at: string
  // Actor data (denormalised by caller after fetch)
  actor_name?: string | null
  actor_avatar?: string | null
  actor_code?: string | null
}

/** Translate raw kind/subject into a friendly line of text + a destination link. */
function renderActivity(a: ActivityEntry, lang: 'no' | 'en') {
  const name = a.actor_name || 'Anonym'
  const code = a.actor_code
  const subject = a.subject_label || '—'

  switch (a.kind) {
    case 'artist_published': {
      const slug = a.metadata?.page_slug
      const link = slug ? `/p/${slug}` : (code ? `/u/${code}` : '#')
      return {
        text: lang === 'no'
          ? `publiserte artistsiden til `
          : `published artist page for `,
        subjectText: subject,
        link,
        emoji: '🎤',
      }
    }
    case 'song_released': {
      const link = code ? `/u/${code}` : '#'
      const artistName = a.metadata?.artist_name
      return {
        text: lang === 'no'
          ? `slapp en ny låt${artistName ? ` med ${artistName}` : ''}: `
          : `released a new song${artistName ? ` with ${artistName}` : ''}: `,
        subjectText: subject,
        link,
        emoji: '🎵',
      }
    }
    case 'studio_published': {
      const slug = a.metadata?.slug
      const link = slug ? `/studio/${slug}` : (code ? `/u/${code}` : '#')
      return {
        text: lang === 'no'
          ? `åpnet sin studio-side `
          : `opened their studio page `,
        subjectText: subject,
        link,
        emoji: '🌐',
      }
    }
    case 'badge_reached': {
      const tier = a.metadata?.tier
      const tierEmoji: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }
      const tierName: Record<string, string> = lang === 'no'
        ? { bronze: 'Bronse', silver: 'Sølv', gold: 'Gull', platinum: 'Platina' }
        : { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }
      return {
        text: lang === 'no'
          ? `nådde ${tier ? tierName[tier] || tier : ''}-nivå `
          : `reached ${tier ? tierName[tier] || tier : ''} tier `,
        subjectText: tier ? tierEmoji[tier] || '' : '',
        link: code ? `/u/${code}` : '#',
        emoji: '🏆',
      }
    }
    default:
      return {
        text: a.kind,
        subjectText: subject,
        link: code ? `/u/${code}` : '#',
        emoji: '✨',
      }
  }
}

function timeAgo(iso: string, lang: 'no' | 'en'): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (s < 60)  return lang === 'no' ? 'akkurat nå' : 'just now'
  if (m < 60)  return lang === 'no' ? `${m} min siden` : `${m}m ago`
  if (h < 24)  return lang === 'no' ? `${h} t siden`   : `${h}h ago`
  if (d < 30)  return lang === 'no' ? `${d} d siden`   : `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function ActivityList({
  entries,
  lang,
  compact = false,
  emptyMessage,
}: {
  entries: ActivityEntry[]
  lang: 'no' | 'en'
  compact?: boolean
  emptyMessage?: string
}) {
  if (entries.length === 0) {
    return (
      <div style={{ color: '#6a5a40', fontSize: 13, padding: 20, textAlign: 'center' }}>
        {emptyMessage || (lang === 'no' ? 'Ingen aktivitet ennå.' : 'No activity yet.')}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10 }}>
      {entries.map(a => {
        const rendered = renderActivity(a, lang)
        const profileLink = a.actor_code ? `/u/${a.actor_code}` : '#'
        return (
          <div key={a.id} style={{
            display: 'flex',
            gap: 10,
            padding: compact ? '8px 10px' : '12px 14px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(180,140,80,0.12)',
            borderRadius: 6,
            alignItems: 'flex-start',
          }}>
            <Avatar value={a.actor_avatar} name={a.actor_name} seed={a.actor_id} size={compact ? 28 : 36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#c8c0b0', fontSize: compact ? 12 : 13, lineHeight: 1.4 }}>
                <Link href={profileLink} style={{ color: '#e8e0d0', textDecoration: 'none', fontWeight: 600 }}>
                  {a.actor_name || (lang === 'no' ? 'Anonym' : 'Anonymous')}
                </Link>{' '}
                {rendered.text}
                <Link href={rendered.link} style={{ color: '#d4a843', textDecoration: 'none' }}>
                  {rendered.emoji} {rendered.subjectText}
                </Link>
              </div>
              <div style={{ color: '#5a4a30', fontSize: 10, marginTop: 2 }}>
                {timeAgo(a.created_at, lang)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
