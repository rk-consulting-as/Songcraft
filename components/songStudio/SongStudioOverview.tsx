'use client'

import Link from 'next/link'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import SongCreativeDirectionPanel from '@/components/songStudio/SongCreativeDirectionPanel'
import { isStoryPubliclyLive } from '@/lib/artistStories/visibility'
import { clientPublicUrl } from '@/lib/appUrl'
import type { CreativeDirection } from '@/lib/songCreation/creativeDirection'
import { useSongEngagementStats } from '@/lib/songStudio/useSongEngagementStats'
import { t, useLang } from '@/lib/i18n'

type CheckItem = { key: string; label: string; done: boolean; action?: string; points?: number }

type Props = {
  songId: string
  internalPlayCount?: number | null
  embedClickCount?: number | null
  readinessScore: number
  missingItems: CheckItem[]
  recommendedActions: CheckItem[]
  statusLabel?: string
  publicPageAvailable?: boolean
  distributionStatus?: string | null
  campaignTimelineCount?: number
  artistId?: string | null
  pageSlug?: string | null
  pageEnabled?: boolean
  linkedStory?: { id: string; title: string; slug: string; status: string; published_at?: string | null; public_hidden?: boolean } | null
  onGoToPanel: (panel: string) => void
  creativeDirection?: CreativeDirection | null
  publishContent?: Record<string, unknown>
  onSaveCreativeDirection?: (publishContent: Record<string, unknown>) => Promise<void>
  onApplyDirectionLyrics?: () => void
  onApplyDirectionSuno?: () => void
}

export default function SongStudioOverview({
  songId,
  internalPlayCount,
  embedClickCount,
  readinessScore,
  missingItems,
  recommendedActions,
  statusLabel,
  publicPageAvailable,
  distributionStatus,
  campaignTimelineCount = 0,
  artistId,
  pageSlug,
  pageEnabled,
  linkedStory,
  onGoToPanel,
  creativeDirection,
  publishContent,
  onSaveCreativeDirection,
  onApplyDirectionLyrics,
  onApplyDirectionSuno,
}: Props) {
  const tx = t[useLang()] as Record<string, string>
  const engagement = useSongEngagementStats(songId, {
    internal_play_count: internalPlayCount,
    embed_click_count: embedClickCount,
  })
  const scoreColor = readinessScore >= 80 ? '#7bc87b' : readinessScore >= 55 ? '#d4a843' : '#e07070'

  const engagementRows = [
    { label: tx.songStudioPublicPageViews, value: engagement.publicPageViews },
    { label: tx.songStudioMediaClicks, value: engagement.mediaLinkClicks },
    { label: tx.songStudioQrVisits, value: engagement.qrVisits },
    { label: tx.songStudioEmbedViews, value: engagement.embedViews },
    { label: tx.songStudioPlays, value: engagement.plays },
    { label: tx.songStudioEmbedClicks, value: engagement.embedClicks },
    { label: tx.songStudioNewsletterSignups, value: engagement.newsletterSignups },
  ]

  const hasEngagement = engagementRows.some(r => r.value > 0)

  return (
    <div className="song-studio-overview workspace-section">
      <div className="card workspace-card workspace-glass song-studio-overview__score">
        <div className="song-studio-overview__score-row">
          <div>
            <h2 className="workspace-section-title">{tx.songStudioOverviewTitle}</h2>
            <p className="workspace-section-desc">{tx.songStudioOverviewDesc}</p>
          </div>
          <div className="song-studio-overview__score-badge" style={{ color: scoreColor }} aria-label={`${tx.reviewScore}: ${readinessScore}`}>
            <span className="song-studio-overview__score-value">{readinessScore}</span>
            <span className="song-studio-overview__score-label">{tx.reviewScore}</span>
          </div>
        </div>
        <div className="song-studio-overview__progress" aria-hidden="true">
          <div className="song-studio-overview__progress-fill" style={{ width: `${readinessScore}%`, background: scoreColor }} />
        </div>
      </div>

      {publishContent && onSaveCreativeDirection && onApplyDirectionLyrics && onApplyDirectionSuno && (
        <SongCreativeDirectionPanel
          direction={creativeDirection ?? null}
          publishContent={publishContent}
          onSave={onSaveCreativeDirection}
          onApplyLyrics={onApplyDirectionLyrics}
          onApplySuno={onApplyDirectionSuno}
        />
      )}

      <div className="song-studio-overview__grid">
        <div className="card workspace-card workspace-glass">
          <h3 className="workspace-card-title">{tx.songStudioStatusSummary}</h3>
          <ul className="song-studio-overview__list">
            {statusLabel && <li><span>{tx.status}</span><strong>{statusLabel}</strong></li>}
            <li><span>{tx.songStudioPublicStatus}</span><strong>{publicPageAvailable ? tx.yes : tx.no}</strong></li>
            <li><span>{tx.distributionTab}</span><strong>{distributionStatus || '—'}</strong></li>
            <li><span>{tx.campaignTitle}</span><strong>{campaignTimelineCount > 0 ? `${campaignTimelineCount} ${tx.timelinePlanned.toLowerCase()}` : '—'}</strong></li>
          </ul>
        </div>

        <div className="card workspace-card workspace-glass">
          <h3 className="workspace-card-title">{tx.songStudioEngagement}</h3>
          {engagement.loading ? (
            <p className="workspace-section-desc">{tx.loading}</p>
          ) : !hasEngagement ? (
            <WorkspaceEmptyState
              icon="📊"
              title={tx.songStudioEmptyAnalytics}
              description={tx.songStudioEmptyAnalyticsDesc}
              action={(
                <button type="button" className="btn-outline quick-action-btn" onClick={() => onGoToPanel('publish')}>
                  {tx.songStudioViewPublishTools}
                </button>
              )}
            />
          ) : (
            <ul className="song-studio-overview__list">
              {engagementRows.filter(r => r.value > 0).map(row => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value.toLocaleString()}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {linkedStory && artistId && (
        <div className="card workspace-card workspace-glass song-studio-overview__linked-story">
          <h3 className="workspace-card-title">{tx.storyLinkedStoryTitle}</h3>
          <p className="workspace-section-desc">{linkedStory.title}</p>
          <div className="song-studio-overview__actions">
            <Link href={`/artist/${artistId}#brand-stories`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              {tx.storyEditLinkedStory}
            </Link>
            {pageSlug && pageEnabled && isStoryPubliclyLive(linkedStory) && (
              <a
                href={clientPublicUrl(`/p/${pageSlug}/stories/${linkedStory.slug}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline quick-action-btn"
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                {tx.storyViewPublic} ↗
              </a>
            )}
          </div>
        </div>
      )}

      {missingItems.length > 0 && (
        <div className="card workspace-card workspace-glass">
          <h3 className="workspace-card-title">{tx.reviewMissingItems}</h3>
          <ul className="song-studio-overview__missing">
            {missingItems.slice(0, 6).map(item => (
              <li key={item.key}>
                <span>{item.label}</span>
                {item.action && (
                  <button
                    type="button"
                    className="btn-outline quick-action-btn"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => onGoToPanel(item.key === 'public' ? 'media' : item.key === 'share' ? 'publish' : item.key === 'campaign' ? 'campaign' : item.key)}
                  >
                    {item.action}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendedActions.length > 0 && (
        <div className="card workspace-card workspace-glass">
          <h3 className="workspace-card-title">{tx.songStudioNextStep}</h3>
          <p className="workspace-section-desc">{recommendedActions[0]?.action || tx.songStudioOverviewDesc}</p>
          <div className="song-studio-overview__actions">
            <button type="button" className="btn-gold quick-action-btn" onClick={() => onGoToPanel('campaign')}>{tx.songStudioOpenReleaseCampaign}</button>
            <button type="button" className="btn-outline quick-action-btn" onClick={() => onGoToPanel(
              missingItems[0]?.key === 'lyrics' || missingItems[0]?.key === 'lyrics_platform' ? 'lyrics'
                : missingItems[0]?.key === 'prompt_platform' ? 'suno'
                  : 'suno',
            )}>{tx.songStudioContinueCreating}</button>
            {artistId && (
              <Link href={`/artist/${artistId}?storySong=${encodeURIComponent(songId)}#brand-stories`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
                {tx.storyGenerateBehindTheSong}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
