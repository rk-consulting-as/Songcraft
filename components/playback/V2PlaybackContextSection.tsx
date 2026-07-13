import V2SectionHeader from '@/components/v2/V2SectionHeader'
import ListeningActivityCard from '@/components/playback/ListeningActivityCard'
import PlaybackReportCard from '@/components/playback/PlaybackReportCard'
import PlaybackTimeline from '@/components/playback/PlaybackTimeline'
import PlaybackListeningControls from '@/components/playback/PlaybackListeningControls'
import { fetchPlaybackContextSummary } from '@/lib/playback/data/fetchPlaybackContext'
import { PLAYBACK_LABELS } from '@/lib/playback/types'

type Props = {
  contextType: 'v2_session' | 'v2_playlist_room' | 'song_page'
  contextId: string
  title?: string
  showControls?: boolean
  demoMode?: boolean
  isLoggedIn?: boolean
}

export default async function V2PlaybackContextSection({
  contextType,
  contextId,
  title,
  showControls = false,
  demoMode = false,
  isLoggedIn = false,
}: Props) {
  const summary = await fetchPlaybackContextSummary(contextType, contextId)

  return (
    <section className="v2-section">
      <V2SectionHeader
        title={title || PLAYBACK_LABELS.evidence}
        lead="Platform-independent listening activity from multiple evidence sources. Confidence is always visible."
      />
      {showControls && isLoggedIn && (
        <div style={{ marginBottom: 16 }}>
          <PlaybackListeningControls
            contextType={contextType === 'song_page' ? 'v2_session' : contextType}
            contextId={contextId}
            demoMode={demoMode}
            disabled={contextType === 'song_page'}
          />
        </div>
      )}
      <div className="v2-grid cols-2">
        <ListeningActivityCard summary={summary} />
        {summary.report ? (
          <PlaybackReportCard report={summary.report} compact />
        ) : (
          <PlaybackTimeline sessions={summary.sessions} />
        )}
      </div>
    </section>
  )
}
