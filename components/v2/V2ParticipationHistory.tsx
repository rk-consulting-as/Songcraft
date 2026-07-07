import Link from 'next/link'
import V2SectionHeader from '@/components/v2/V2SectionHeader'
import type { V2ParticipationHistoryItem } from '@/lib/v2/types'

const TYPE_LABELS: Record<V2ParticipationHistoryItem['type'], string> = {
  session_joined: 'Joined',
  session_listened: 'Listened',
  feedback: 'Feedback',
  song_submission: 'Supported',
  playlist_listened: 'Room listening',
}

type Props = {
  items: V2ParticipationHistoryItem[]
  title?: string
  lead?: string
  limit?: number
}

export default function V2ParticipationHistory({ items, title = 'Participation history', lead, limit }: Props) {
  const visible = limit ? items.slice(0, limit) : items

  return (
    <section className="v2-section" style={{ marginTop: 0 }}>
      <V2SectionHeader title={title} lead={lead} />
      <div className="v2-card">
        {visible.length === 0 && (
          <p className="v2-meta">No participation logged yet — join a session or playlist room to begin.</p>
        )}
        {visible.map(item => (
          <div key={item.id} className="v2-track">
            <span className="num">{TYPE_LABELS[item.type].charAt(0)}</span>
            <div>
              <b>{item.title}</b>
              <span>{item.subtitle}</span>
            </div>
            <span className="v2-meta">{new Date(item.at).toLocaleDateString()}</span>
            {item.href && (
              <Link href={item.href} className="v2-btn sm secondary">Open</Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
