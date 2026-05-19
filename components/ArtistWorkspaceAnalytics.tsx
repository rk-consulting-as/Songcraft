'use client'

import Link from 'next/link'
import ClickStats from '@/components/ClickStats'
import UpgradePrompt from '@/components/UpgradePrompt'
import WorkspaceCollapsible from '@/components/WorkspaceCollapsible'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import { t, useLang, type Lang } from '@/lib/i18n'

export type AnalyticsEvent = {
  id: string
  artist_id?: string | null
  song_id?: string | null
  event_type: 'artist_page_view' | 'song_page_view' | 'newsletter_signup' | 'embed_view' | 'embed_click'
  source?: string | null
  referrer?: string | null
  created_at: string
  metadata?: any
  songs?: { title?: string | null } | null
}

type SongRef = { id: string; title: string }

export default function ArtistWorkspaceAnalytics({
  artistId,
  planId,
  analyticsRange,
  onRangeChange,
  analyticsLoading,
  analyticsEvents,
  songs,
}: {
  artistId: string
  planId: 'free' | 'pro'
  analyticsRange: '7d' | '30d' | 'all'
  onRangeChange: (range: '7d' | '30d' | 'all') => void
  analyticsLoading: boolean
  analyticsEvents: AnalyticsEvent[]
  songs: SongRef[]
}) {
  const lang = useLang()
  const tx = t[lang]

  const publicPageViews = analyticsEvents.filter(e => e.event_type === 'artist_page_view' || e.event_type === 'song_page_view')
  const artistPageViews = analyticsEvents.filter(e => e.event_type === 'artist_page_view').length
  const songPageViews = analyticsEvents.filter(e => e.event_type === 'song_page_view').length
  const newsletterConversions = analyticsEvents.filter(e => e.event_type === 'newsletter_signup').length
  const embedViews = analyticsEvents.filter(e => e.event_type === 'embed_view').length
  const embedClicks = analyticsEvents.filter(e => e.event_type === 'embed_click').length
  const conversionRate = publicPageViews.length > 0
    ? Math.round((newsletterConversions / publicPageViews.length) * 1000) / 10
    : 0
  const qrTrafficCount = analyticsEvents.filter(e => e.source === 'qr').length
  const songTitleById = new Map(songs.map(s => [s.id, s.title]))

  const topSongVisits = Array.from(
    analyticsEvents
      .filter(e => e.event_type === 'song_page_view' && e.song_id)
      .reduce((map, event) => {
        const songId = event.song_id!
        const current = map.get(songId) || {
          songId,
          title: songTitleById.get(songId) || (event.songs as any)?.title || tx.song,
          visits: 0,
        }
        current.visits += 1
        map.set(songId, current)
        return map
      }, new Map<string, { songId: string; title: string; visits: number }>())
      .values()
  ).sort((a, b) => b.visits - a.visits).slice(0, 5)

  const recentPublicTraffic = analyticsEvents
    .filter(e =>
      (e.event_type === 'artist_page_view' || e.event_type === 'song_page_view') && e.source !== 'qr'
    )
    .slice(0, 8)

  const recentQrTraffic = analyticsEvents
    .filter(e => e.source === 'qr')
    .slice(0, 8)

  const topEmbeddedSongs = Array.from(
    analyticsEvents
      .filter(e => e.event_type === 'embed_view' && e.song_id)
      .reduce((map, event) => {
        const songId = event.song_id!
        const current = map.get(songId) || {
          songId,
          title: songTitleById.get(songId) || (event.songs as any)?.title || tx.song,
          views: 0,
        }
        current.views += 1
        map.set(songId, current)
        return map
      }, new Map<string, { songId: string; title: string; views: number }>())
      .values()
  ).sort((a, b) => b.views - a.views).slice(0, 5)

  const signupEvents = analyticsEvents.filter(e => e.event_type === 'newsletter_signup').slice(0, 8)

  const hasAnyData = analyticsEvents.length > 0

  const rangePicker = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {([
        ['7d', tx.analyticsRange7d],
        ['30d', tx.analyticsRange30d],
        ['all', tx.analyticsRangeAll],
      ] as const).map(([range, label]) => {
        const active = analyticsRange === range
        return (
          <button
            key={range}
            type="button"
            onClick={() => onRangeChange(range)}
            style={{
              padding: '5px 12px',
              borderRadius: 14,
              border: active ? '1px solid #7090d0' : '1px solid rgba(180,140,80,0.2)',
              background: active ? 'rgba(112,144,208,0.14)' : 'transparent',
              color: active ? '#a8b8e8' : '#6a5a40',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )

  const statMini = (label: string, value: string | number) => (
    <div className="workspace-analytics-stat">
      <div className="workspace-analytics-stat-label">{label}</div>
      <div className="workspace-analytics-stat-value">{value}</div>
    </div>
  )

  if (analyticsLoading) {
    return (
      <div className="workspace-section">
        <div className="card workspace-card">
          <p style={{ color: '#6a5a40', fontSize: 13, margin: 0 }}>{tx.loading}</p>
        </div>
      </div>
    )
  }

  if (!hasAnyData) {
    return (
      <div className="workspace-section">
        <div className="card workspace-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <h2 className="workspace-section-title" style={{ margin: 0 }}>{tx.workspaceTabAnalytics}</h2>
            {rangePicker}
          </div>
          <WorkspaceEmptyState
            icon="📊"
            title={tx.workspaceEmptyNoAnalytics}
            description={tx.workspaceEmptyNoAnalyticsDesc}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-section workspace-analytics-sections">
      <div className="card workspace-card" style={{ borderColor: 'rgba(112,144,208,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <h2 className="workspace-section-title" style={{ margin: 0, color: '#7090d0' }}>{tx.fanAnalyticsTitle}</h2>
            <p style={{ color: '#8a7a60', fontSize: 12, margin: '4px 0 0' }}>{tx.fanAnalyticsDesc}</p>
          </div>
          {rangePicker}
        </div>
        {planId === 'free' && (
          <UpgradePrompt compact title={tx.upgradeAnalyticsTitle} description={tx.upgradeAnalyticsDesc} />
        )}
      </div>

      <WorkspaceCollapsible
        title={tx.workspaceAnalyticsPublicTraffic}
        summary={`${publicPageViews.length}`}
        defaultOpen
      >
        <div className="workspace-analytics-grid" style={{ marginBottom: 12 }}>
          {statMini(tx.fanAnalyticsTotalViews, publicPageViews.length)}
          {statMini(tx.fanAnalyticsArtistViews, artistPageViews)}
          {statMini(tx.fanAnalyticsSongViews, songPageViews)}
        </div>
        <div className="workspace-analytics-split">
          <div>
            <h4 className="workspace-analytics-subtitle">{tx.fanAnalyticsTopSongs}</h4>
            {topSongVisits.length === 0 ? (
              <p className="workspace-analytics-muted">{tx.fanAnalyticsNoSongVisits}</p>
            ) : (
              <div className="workspace-analytics-list">
                {topSongVisits.map(song => (
                  <Link key={song.songId} href={`/song/${song.songId}`} className="workspace-analytics-row">
                    <span>{song.title}</span>
                    <span className="workspace-analytics-row-value">{song.visits}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="workspace-analytics-subtitle">{tx.fanAnalyticsRecentTraffic}</h4>
            {recentPublicTraffic.length === 0 ? (
              <p className="workspace-analytics-muted">{tx.fanAnalyticsNoTraffic}</p>
            ) : (
              <div className="workspace-analytics-list">
                {recentPublicTraffic.map(event => (
                  <TrafficRow key={event.id} event={event} lang={lang} tx={tx} songTitleById={songTitleById} />
                ))}
              </div>
            )}
          </div>
        </div>
      </WorkspaceCollapsible>

      <WorkspaceCollapsible title={tx.workspaceAnalyticsQr} summary={`${qrTrafficCount}`}>
        <div className="workspace-analytics-grid" style={{ marginBottom: 12 }}>
          {statMini(tx.fanAnalyticsQrVisits, qrTrafficCount)}
        </div>
        {recentQrTraffic.length === 0 ? (
          <WorkspaceEmptyState icon="▣" title={tx.workspaceEmptyNoQr} description={tx.workspaceEmptyNoQrDesc} />
        ) : (
          <div className="workspace-analytics-list">
            {recentQrTraffic.map(event => (
              <TrafficRow key={event.id} event={event} lang={lang} tx={tx} songTitleById={songTitleById} showQr />
            ))}
          </div>
        )}
      </WorkspaceCollapsible>

      <WorkspaceCollapsible
        title={tx.workspaceAnalyticsEmbed}
        summary={`${embedViews} / ${embedClicks}`}
      >
        <div className="workspace-analytics-grid" style={{ marginBottom: 12 }}>
          {statMini(tx.embedViews, embedViews)}
          {statMini(tx.embedClicks, embedClicks)}
        </div>
        {topEmbeddedSongs.length === 0 ? (
          <WorkspaceEmptyState icon="⧉" title={tx.workspaceEmptyNoEmbed} description={tx.workspaceEmptyNoEmbedDesc} />
        ) : (
          <div className="workspace-analytics-list">
            {topEmbeddedSongs.map(song => (
              <Link key={song.songId} href={`/song/${song.songId}`} className="workspace-analytics-row workspace-analytics-row-embed">
                <span>{song.title}</span>
                <span className="workspace-analytics-row-value">{song.views}</span>
              </Link>
            ))}
          </div>
        )}
      </WorkspaceCollapsible>

      <WorkspaceCollapsible
        title={tx.workspaceAnalyticsFanConversion}
        summary={`${newsletterConversions} · ${conversionRate}%`}
      >
        <div className="workspace-analytics-grid" style={{ marginBottom: 12 }}>
          {statMini(tx.fanAnalyticsSignups, newsletterConversions)}
          {statMini(tx.fanAnalyticsConversion, `${conversionRate}%`)}
        </div>
        {signupEvents.length === 0 ? (
          <WorkspaceEmptyState icon="✉" title={tx.workspaceEmptyNoSignups} description={tx.workspaceEmptyNoSignupsDesc} />
        ) : (
          <div className="workspace-analytics-list">
            {signupEvents.map(event => (
              <div key={event.id} className="workspace-analytics-row">
                <span>{tx.fanAnalyticsSignups}</span>
                <span className="workspace-analytics-row-value">
                  {new Date(event.created_at).toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US')}
                </span>
              </div>
            ))}
          </div>
        )}
      </WorkspaceCollapsible>

      <WorkspaceCollapsible title={tx.workspaceAnalyticsClicks}>
        <p className="workspace-analytics-muted" style={{ margin: '0 0 12px' }}>{tx.workspaceAnalyticsClicksDesc}</p>
        <ClickStats artistId={artistId} compact />
      </WorkspaceCollapsible>
    </div>
  )
}

function TrafficRow({
  event,
  lang,
  tx,
  songTitleById,
  showQr,
}: {
  event: AnalyticsEvent
  lang: Lang
  tx: (typeof t)['en']
  songTitleById: Map<string, string>
  showQr?: boolean
}) {
  const label =
    event.event_type === 'artist_page_view'
      ? tx.fanAnalyticsArtistPage
      : event.event_type === 'embed_view'
        ? tx.embedView
        : event.event_type === 'embed_click'
          ? tx.embedClick
          : tx.fanAnalyticsSongPage

  return (
    <div className={`workspace-analytics-row${showQr || event.source === 'qr' ? ' is-qr' : ''}`}>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#e8e0d0', fontSize: 12 }}>
          {label}
          {(showQr || event.source === 'qr') ? ' · QR' : ''}
        </div>
        {event.song_id && (
          <div style={{ color: '#6a5a40', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {songTitleById.get(event.song_id) || (event.songs as any)?.title}
          </div>
        )}
      </div>
      <span className="workspace-analytics-row-value">
        {new Date(event.created_at).toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US')}
      </span>
    </div>
  )
}
