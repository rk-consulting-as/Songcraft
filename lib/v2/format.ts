/** Compact relative time, e.g. "just now", "3h ago", "2d ago". English-only. */
export function timeAgo(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  if (diff < 0) return 'just now'

  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.floor(days / 365)}y ago`
}

const DEFAULT_TZ = 'UTC'

/** Format session date/time for display, e.g. "Fri, Jul 11 · 8:00 PM". */
export function formatSessionDateTime(iso: string, timezone?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || DEFAULT_TZ,
    }
    return new Intl.DateTimeFormat('en-US', opts).format(d)
  } catch {
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }
}

export function formatSessionTime(iso: string, timezone?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || DEFAULT_TZ,
    }).format(d)
  } catch {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
}

/** Calendar group label, e.g. "Today", "Tomorrow", "Friday, Jul 11". */
export function formatCalendarDayLabel(iso: string, timezone?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Date TBD'

  const now = new Date()
  const startOfDay = (date: Date) => {
    const x = new Date(date)
    x.setHours(0, 0, 0, 0)
    return x.getTime()
  }
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'

  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      timeZone: timezone || DEFAULT_TZ,
    }).format(d)
  } catch {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }
}

export function formatCalendarDateKey(iso: string, timezone?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'tbd'
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || DEFAULT_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

/** Countdown label if starting within 24h, e.g. "Starts in 2h 15m". */
export function formatSessionCountdown(startsAt: string, status: string): string | null {
  if (status === 'live') return 'Live now'
  if (status === 'ended') return null
  const start = new Date(startsAt).getTime()
  if (Number.isNaN(start)) return null
  const diff = start - Date.now()
  if (diff <= 0) return 'Starting soon'
  if (diff > 24 * 60 * 60 * 1000) return null
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `Starts in ${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${h}h`
}

export function isStartingSoon(startsAt: string, withinMs = 2 * 60 * 60 * 1000): boolean {
  const start = new Date(startsAt).getTime()
  if (Number.isNaN(start)) return false
  const diff = start - Date.now()
  return diff > 0 && diff <= withinMs
}

export function isThisWeek(iso: string): boolean {
  const d = new Date(iso).getTime()
  if (Number.isNaN(d)) return false
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  return d >= now - 86400000 && d <= now + weekMs
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Generate a minimal .ics file for a session (no external API). */
export function buildSessionIcs(params: {
  title: string
  startsAt: string
  endsAt?: string
  description?: string
  url?: string
  uid?: string
}): string {
  const start = icsDate(params.startsAt)
  const end = icsDate(params.endsAt || new Date(new Date(params.startsAt).getTime() + 90 * 60000).toISOString())
  const uid = params.uid || `session-${start}@viatone.community`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ViaTone Community//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(params.title)}`,
  ]
  if (params.description) lines.push(`DESCRIPTION:${icsEscape(params.description)}`)
  if (params.url) lines.push(`URL:${params.url}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadSessionIcs(params: Parameters<typeof buildSessionIcs>[0], filename?: string): void {
  if (typeof window === 'undefined') return
  const ics = buildSessionIcs(params)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `${params.title.replace(/[^\w-]+/g, '-').slice(0, 40)}.ics`
  a.click()
  URL.revokeObjectURL(url)
}

export const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
}
