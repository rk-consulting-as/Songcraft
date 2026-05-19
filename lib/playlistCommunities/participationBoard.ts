import type { ActivityLogStatus, CampaignActivityLog, DayCellSymbol, ParticipationBoardMember } from './activityTypes'

export function formatDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function getWeekDates(reference = new Date()): string[] {
  const d = new Date(reference)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    dates.push(formatDateYmd(x))
  }
  return dates
}

export function symbolForLog(
  log: CampaignActivityLog | undefined,
  dateStr: string,
  todayStr: string
): DayCellSymbol {
  if (!log) {
    if (dateStr < todayStr) return 'missed'
    return 'empty'
  }
  switch (log.status) {
    case 'approved':
      return 'completed'
    case 'submitted':
    case 'pending':
      return 'pending'
    case 'rejected':
      return 'attention'
    case 'missed':
      return 'missed'
    default:
      return 'empty'
  }
}

export function symbolToEmoji(symbol: DayCellSymbol): string {
  switch (symbol) {
    case 'completed':
      return '☑️'
    case 'pending':
      return '⌛'
    case 'missed':
      return '❌'
    case 'attention':
      return '⚠️'
    case 'week_complete':
      return '🔥'
    default:
      return '·'
  }
}

type MemberInput = {
  id: string
  artistName: string | null
  songTitle: string | null
  songHref: string | null
}

export function buildParticipationBoard(
  members: MemberInput[],
  logs: CampaignActivityLog[],
  weekDates: string[],
  todayStr = formatDateYmd(new Date())
): ParticipationBoardMember[] {
  return members.map(m => {
    const memberLogs = logs.filter(l => l.member_id === m.id)
    const days = weekDates.map(date => {
      const log = memberLogs.find(l => l.activity_date === date)
      return {
        date,
        symbol: symbolForLog(log, date, todayStr),
        logId: log?.id,
      }
    })
    const approvedCount = memberLogs.filter(l => l.status === 'approved').length
    const missedCount = memberLogs.filter(l => l.status === 'missed').length
    const pendingCount = memberLogs.filter(l => l.status === 'submitted' || l.status === 'pending').length
    const totalSubmitted = memberLogs.filter(l => l.proof_type !== 'manual' || l.proof_text || l.proof_asset_id).length
    const weekComplete = days.every(d => d.symbol === 'completed')
    const currentStatus =
      pendingCount > 0
        ? 'pending_review'
        : weekComplete
          ? 'week_complete'
          : missedCount > 0
            ? 'needs_attention'
            : 'on_track'

    return {
      memberId: m.id,
      artistName: m.artistName,
      songTitle: m.songTitle,
      songHref: m.songHref,
      days,
      totalSubmitted,
      approvedCount,
      missedCount,
      pendingCount,
      currentStatus,
      weekComplete,
    }
  })
}

export function countPendingReviews(logs: CampaignActivityLog[]): number {
  return logs.filter(l => l.status === 'submitted' || l.status === 'pending').length
}
