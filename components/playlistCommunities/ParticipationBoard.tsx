'use client'

import Link from 'next/link'
import type { ParticipationBoardMember } from '@/lib/playlistCommunities/activityTypes'
import { symbolToEmoji } from '@/lib/playlistCommunities/participationBoard'
import { t, useLang } from '@/lib/i18n'

function formatDayLabel(dateStr: string, lang: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US', { weekday: 'short' })
}

function statusLabel(tx: Record<string, string>, status: string) {
  const key = `participationStatus_${status}`
  return tx[key] || status
}

export default function ParticipationBoard({
  board,
  weekDates,
  showStats = true,
}: {
  board: ParticipationBoardMember[]
  weekDates: string[]
  showStats?: boolean
}) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>

  if (!board.length) {
    return <p className="participation-board-empty">{tx.participationBoardEmpty}</p>
  }

  return (
    <div className="participation-board-wrap">
      <table className="participation-board" aria-label={tx.participationBoardTitle}>
        <thead>
          <tr>
            <th>{tx.participationColMember}</th>
            <th>{tx.participationColSong}</th>
            {weekDates.map(d => (
              <th key={d} className="participation-board__day" title={d}>
                {formatDayLabel(d, lang)}
              </th>
            ))}
            {showStats && (
              <>
                <th>{tx.participationColSubmitted}</th>
                <th>{tx.participationColApproved}</th>
                <th>{tx.participationColMissed}</th>
                <th>{tx.participationColStatus}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {board.map(row => (
            <tr key={row.memberId}>
              <td className="participation-board__member">{row.artistName || tx.playlistCommunityMember}</td>
              <td className="participation-board__song">
                {row.songTitle ? (
                  row.songHref ? (
                    <Link href={row.songHref}>{row.songTitle}</Link>
                  ) : (
                    row.songTitle
                  )
                ) : (
                  '—'
                )}
              </td>
              {row.days.map(day => (
                <td key={day.date} className="participation-board__cell" title={day.date}>
                  <span aria-hidden>{symbolToEmoji(day.symbol)}</span>
                </td>
              ))}
              {showStats && (
                <>
                  <td>{row.totalSubmitted}</td>
                  <td>{row.approvedCount}</td>
                  <td>{row.missedCount}</td>
                  <td>
                    <span className={`participation-status participation-status--${row.currentStatus}`}>
                      {row.weekComplete ? '🔥 ' : ''}
                      {statusLabel(tx, row.currentStatus)}
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="participation-board-legend" aria-hidden>
        ☑️ {tx.participationLegendCompleted} · ⌛ {tx.participationLegendPending} · ❌ {tx.participationLegendMissed} · ⚠️ {tx.participationLegendAttention} · 🔥 {tx.participationLegendWeekComplete}
      </p>
    </div>
  )
}
