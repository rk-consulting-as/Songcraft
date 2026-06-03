'use client'

import Link from 'next/link'
import type { DashboardInsightsData } from '@/lib/dashboard/types'

type Props = {
  insights: DashboardInsightsData
  tx: Record<string, string>
}

export default function DashboardInsights({ insights, tx }: Props) {
  return (
    <section className="dashboard-section dashboard-insights">
      <h2 className="dashboard-section__title">{tx.cmdInsightsTitle}</h2>
      <div className="dashboard-insights__counts">
        <div className="dashboard-insight-mini card workspace-card">
          <span className="dashboard-insight-mini__value">{insights.artistCount}</span>
          <span className="dashboard-insight-mini__label">{tx.artists}</span>
        </div>
        <div className="dashboard-insight-mini card workspace-card">
          <span className="dashboard-insight-mini__value">{insights.songCount}</span>
          <span className="dashboard-insight-mini__label">{tx.totalSongs}</span>
        </div>
        <div className="dashboard-insight-mini card workspace-card">
          <span className="dashboard-insight-mini__value">{insights.projectCount}</span>
          <span className="dashboard-insight-mini__label">{tx.activeProjects}</span>
        </div>
      </div>
      <div className="dashboard-insights__grid">
        {insights.topArtist && (
          <Link href={`/artist/${insights.topArtist.id}`} className="dashboard-insight-card card workspace-card">
            <span className="dashboard-insight-card__label">{tx.cmdTopArtist}</span>
            <span className="dashboard-insight-card__value">{insights.topArtist.name}</span>
          </Link>
        )}
        {insights.topSong && (
          <Link href={`/song/${insights.topSong.id}`} className="dashboard-insight-card card workspace-card">
            <span className="dashboard-insight-card__label">{tx.cmdTopSong}</span>
            <span className="dashboard-insight-card__value">{insights.topSong.title}</span>
            {insights.topSong.plays > 0 && (
              <span className="dashboard-insight-card__meta">▶ {insights.topSong.plays.toLocaleString()}</span>
            )}
          </Link>
        )}
        {insights.newestSubscriber && (
          <div className="dashboard-insight-card card workspace-card">
            <span className="dashboard-insight-card__label">{tx.cmdNewestSubscriber}</span>
            <span className="dashboard-insight-card__value">{insights.newestSubscriber.email}</span>
          </div>
        )}
        {insights.newestStory && (
          <Link href={`/artist/${insights.newestStory.artist_id}#brand-stories`} className="dashboard-insight-card card workspace-card">
            <span className="dashboard-insight-card__label">{tx.cmdNewestStory}</span>
            <span className="dashboard-insight-card__value">{insights.newestStory.title}</span>
          </Link>
        )}
      </div>
      <Link href="/analytics" className="dashboard-insights__analytics-link">{tx.analyticsLabelAccount} →</Link>
    </section>
  )
}
