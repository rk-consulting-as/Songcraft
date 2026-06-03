'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import GrowthEnginePanel from '@/components/GrowthEnginePanel'
import PlaylistCampaignCard from '@/components/playlistCommunities/PlaylistCampaignCard'
import WorkspaceEmptyState from '@/components/WorkspaceEmptyState'
import { fetchGrowthHubSnapshot, type GrowthHubSnapshot } from '@/lib/growth/fetchHubSnapshot'
import {
  approveActivitySuggestion,
  ignoreActivitySuggestion,
} from '@/lib/playlistCommunities/client'
import { t, useLang } from '@/lib/i18n'

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="growth-hub-stat-tile">
      <span className="growth-hub-stat-tile__value">{value}</span>
      <span className="growth-hub-stat-tile__label">{label}</span>
    </div>
  )
}

export default function GrowthCommunityHub() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lang = useLang()
  const tx = t[lang] as Record<string, string>
  const artistParam = searchParams.get('artist')

  const [loading, setLoading] = useState(true)
  const [snap, setSnap] = useState<GrowthHubSnapshot | null>(null)
  const [busySuggestionId, setBusySuggestionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchGrowthHubSnapshot(artistParam, lang)
    if (!data) {
      router.push('/login')
      return
    }
    setSnap(data)
    setLoading(false)
  }, [artistParam, lang, router])

  useEffect(() => {
    load()
  }, [load])

  const handleSuggestion = async (id: string, action: 'approve' | 'ignore') => {
    setBusySuggestionId(id)
    try {
      if (action === 'approve') await approveActivitySuggestion(id)
      else await ignoreActivitySuggestion(id)
      setSnap(prev => prev ? {
        ...prev,
        suggestions: prev.suggestions.filter(s => s.id !== id),
      } : prev)
    } finally {
      setBusySuggestionId(null)
    }
  }

  if (loading || !snap) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#8a7a60', padding: 40 }}>
        {tx.loading}
      </div>
    )
  }

  const { engine, participation, ownedCampaigns, joinedCampaigns, discoverCampaigns, suggestions, digest, pageViews, artistId, artistName, fanStats, artists } = snap
  const { growth, progress } = engine
  const playbookQuery = artistId ? `?artist=${artistId}` : ''
  const fanHubHref = artistId ? `/artist/${artistId}#fanhub` : '/dashboard'
  const insightsHref = artistId ? `/artist/${artistId}#analytics` : '/analytics'
  const createCampaignHref = artistId ? `/artist/${artistId}#playlists` : '/discover/campaigns'

  const fanHasActivity =
    fanStats.subscribers > 0 ||
    pageViews > 0 ||
    fanStats.qrClicks > 0 ||
    fanStats.embedViews > 0 ||
    fanStats.linkClicks > 0

  const todayItems: { label: string; href?: string; urgent?: boolean }[] = []
  if (participation?.joinedNeedingProofToday) {
    todayItems.push({
      label: tx.growthHubProofsDueToday,
      href: participation.proofTodayCampaignId ? `/playlist-campaigns/${participation.proofTodayCampaignId}` : '/discover/campaigns',
      urgent: true,
    })
  }
  if (participation?.pendingReviews) {
    todayItems.push({
      label: `${participation.pendingReviews} ${tx.growthHubPendingProofs}`,
      href: participation.reviewCampaignId ? `/playlist-campaigns/${participation.reviewCampaignId}` : undefined,
      urgent: true,
    })
  }
  if (growth.nextRecommendation?.title) {
    todayItems.push({
      label: growth.nextRecommendation.title,
      href: growth.nextRecommendation.href || undefined,
    })
  } else if (progress.nextTask) {
    todayItems.push({
      label: progress.nextTask.label,
      href: progress.nextTask.href || `/playbook${playbookQuery}`,
    })
  }

  return (
    <main className="growth-hub-page">
      <header className="growth-hub-header app-header" data-header="page">
        <div className="growth-hub-header__left">
          <Link href="/dashboard" className="growth-hub-back">← {tx.dashboard}</Link>
          <h1 className="growth-hub-title">{tx.growthHubTitle}</h1>
        </div>
        {artists.length > 1 && (
          <select
            className="growth-hub-artist-select"
            value={artistId || ''}
            onChange={e => router.push(e.target.value ? `/growth?artist=${e.target.value}` : '/growth')}
            aria-label={tx.growthHubFilterArtist}
          >
            <option value="">{tx.growthHubAllArtists}</option>
            {artists.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </header>

      <div className="growth-hub-body page-pad">
        <p className="growth-hub-subtitle">{tx.growthHubSubtitle}</p>

        {artistName && (
          <p className="growth-hub-artist-line">
            {tx.growthHubViewingArtist}: <strong>{artistName}</strong>
          </p>
        )}

        <section className="growth-hub-section" id="today">
          <h2 className="growth-hub-section__title">{tx.growthHubToday}</h2>
          {todayItems.length === 0 ? (
            <div className="card workspace-card">
              <WorkspaceEmptyState
                icon="☀"
                title={tx.growthHubTodayClear}
                description={tx.growthHubTodayClearDesc}
                action={
                  <Link href={`/playbook${playbookQuery}`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>
                    {tx.growthOpenPlaybook}
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="growth-hub-today-list">
              {todayItems.map((item, i) => (
                <li key={`${item.label}-${i}`} className={`growth-hub-today-item${item.urgent ? ' is-urgent' : ''}`}>
                  {item.href ? (
                    <Link href={item.href}>{item.label} →</Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="growth-hub-section" id="overview">
          <h2 className="growth-hub-section__title">{tx.growthHubOverview}</h2>
          <div className="card workspace-card growth-hub-playbook-progress" style={{ marginBottom: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.growthHubArtistProgress}</p>
                <p style={{ margin: '4px 0 0', color: '#d4a843', fontSize: 22, fontWeight: 700 }}>{progress.overallPercent}%</p>
              </div>
              {progress.nextTask && (
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ margin: 0, color: '#8a7a60', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{tx.growthHubPlaybookNextStep}</p>
                  <p style={{ margin: '4px 0 0', color: '#e8e0d0', fontSize: 13 }}>{progress.nextTask.label}</p>
                </div>
              )}
              <Link href={`/playbook${playbookQuery}`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', fontSize: 12 }}>
                {tx.growthOpenPlaybook}
              </Link>
            </div>
          </div>
          <GrowthEnginePanel
            growth={growth}
            compact
            showMissions={false}
            showEmptyStates={false}
            playbookHref={`/playbook?tab=growth${artistId ? `&artist=${artistId}` : ''}`}
          />
          {growth.totalMissionCount === 0 && (
            <div className="card workspace-card" style={{ marginTop: 14 }}>
              <WorkspaceEmptyState
                icon="🧭"
                title={tx.growthHubEmptyNoMissions}
                description={tx.growthHubEmptyNoMissionsDesc}
                action={
                  <Link href={`/playbook${playbookQuery}`} className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
                    {tx.continueGrowthJourney}
                  </Link>
                }
              />
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Link href={`/playbook${playbookQuery}`} className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
              {tx.continueGrowthJourney} →
            </Link>
          </div>
        </section>

        <section className="growth-hub-section" id="community">
          <h2 className="growth-hub-section__title">{tx.growthHubCommunityActivity}</h2>

          {participation && (
            <div className="growth-hub-stat-grid">
              <StatTile label={tx.growthHubPendingProofs} value={participation.pendingReviews} />
              <StatTile label={tx.dashboardPendingSubmissions} value={participation.myPendingSubmissions} />
              <StatTile label={tx.dashboardWeekCompletion} value={`${participation.weekCompletionPercent}%`} />
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="card detected-activity-inbox" style={{ marginBottom: 14 }}>
              <h3 className="detected-activity-inbox__title">{tx.detectedActivityTitle}</h3>
              <p className="detected-activity-inbox__intro">{tx.detectedActivityIntro}</p>
              <ul className="detected-activity-inbox__list">
                {suggestions.slice(0, 4).map(s => (
                  <li key={s.id} className="detected-activity-inbox__item">
                    <p className="detected-activity-inbox__campaign">{s.campaignTitle}</p>
                    <div className="detected-activity-inbox__actions">
                      <button type="button" className="btn-gold" disabled={!!busySuggestionId} onClick={() => handleSuggestion(s.id, 'approve')}>
                        {busySuggestionId === s.id ? tx.loading : tx.detectedActivityApprove}
                      </button>
                      <button type="button" className="btn-outline" disabled={!!busySuggestionId} onClick={() => handleSuggestion(s.id, 'ignore')}>
                        {tx.detectedActivityIgnore}
                      </button>
                      <Link href={`/playlist-campaigns/${s.campaign_id}`} className="btn-outline" style={{ fontSize: 11, textDecoration: 'none' }}>
                        {tx.playlistCommunityView}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {digest && (digest.sessionsDetected > 0 || digest.proofsApproved > 0) && (
            <div className="card weekly-participation-digest" style={{ marginBottom: 14 }}>
              <h3 className="weekly-participation-digest__title">{tx.weeklyDigestTitle}</h3>
              <ul className="weekly-participation-digest__stats">
                <li>{tx.weeklyDigestSessions.replace('{n}', String(digest.sessionsDetected))}</li>
                <li>{tx.weeklyDigestApproved.replace('{n}', String(digest.proofsApproved))}</li>
                <li>{tx.weeklyDigestCampaigns.replace('{n}', String(digest.campaignsParticipated))}</li>
              </ul>
            </div>
          )}

          <div className="growth-hub-two-col">
            <div>
              <h3 className="growth-hub-subsection__title">{tx.growthHubOwnedCampaigns}</h3>
              {ownedCampaigns.length === 0 ? (
                <div className="card workspace-card">
                  <WorkspaceEmptyState
                    icon="↗"
                    title={tx.growthHubEmptyNoOwnedCampaigns}
                    description={tx.growthHubEmptyNoOwnedCampaignsDesc}
                    action={
                      <Link href={createCampaignHref} className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
                        {tx.growthHubCreatePlaylistCampaign}
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="growth-hub-campaign-list">
                  {ownedCampaigns.map(c => (
                    <PlaylistCampaignCard key={c.id} campaign={c} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="growth-hub-subsection__title">{tx.growthHubJoinedCampaigns}</h3>
              {joinedCampaigns.length === 0 ? (
                <div className="card workspace-card">
                  <WorkspaceEmptyState
                    icon="♫"
                    title={tx.growthHubEmptyNoCampaignsJoined}
                    description={tx.growthHubEmptyNoCampaignsJoinedDesc}
                    action={
                      <Link href="/discover/campaigns" className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
                        {tx.growthHubJoinPlaylistCampaign}
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="growth-hub-campaign-list">
                  {joinedCampaigns.map(c => (
                    <PlaylistCampaignCard key={c.id} campaign={c} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {participation && participation.pendingReviews === 0 && participation.joinedNeedingProofToday === 0 && (
            <div className="card workspace-card" style={{ marginTop: 14 }}>
              <WorkspaceEmptyState icon="✓" title={tx.growthHubEmptyNoPendingProofs} description={tx.growthHubEmptyNoPendingProofsDesc} />
            </div>
          )}
        </section>

        <section className="growth-hub-section" id="opportunities">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="growth-hub-section__title">{tx.growthHubOpportunities}</h2>
            <Link href="/discover/campaigns" className="growth-hub-link">{tx.growthHubBrowseDiscover} →</Link>
          </div>
          {discoverCampaigns.length === 0 ? (
            <div className="card workspace-card">
              <WorkspaceEmptyState
                icon="🌍"
                title={tx.discoverCampaignsEmptyDesc}
                action={
                  <Link href="/discover/campaigns" className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>
                    {tx.discoverCampaignsViewAll}
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="growth-hub-campaign-list">
              {discoverCampaigns.slice(0, 4).map(c => (
                <PlaylistCampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </section>

        <section className="growth-hub-section" id="fan-growth">
          <h2 className="growth-hub-section__title">{tx.growthHubFanGrowth}</h2>
          <div className="growth-hub-stat-grid">
            <StatTile label={tx.workspaceStatSubscribers} value={fanStats.subscribers} />
            <StatTile label={tx.workspaceStatPageViews} value={pageViews} />
            <StatTile label={tx.fanAnalyticsQrVisits} value={fanStats.qrClicks} />
            <StatTile label={tx.workspaceAnalyticsEmbed} value={fanStats.embedViews} />
          </div>
          {!fanHasActivity && (
            <div className="card workspace-card" style={{ marginTop: 14 }}>
              <WorkspaceEmptyState
                icon="★"
                title={tx.growthHubEmptyNoFanActivity}
                description={tx.growthHubEmptyNoFanActivityDesc}
                action={
                  artistId ? (
                    <Link href={`/artist/${artistId}#public`} className="btn-gold quick-action-btn" style={{ textDecoration: 'none' }}>
                      {tx.publicPresenceManage}
                    </Link>
                  ) : (
                    <Link href="/dashboard" className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>
                      {tx.dashboard}
                    </Link>
                  )
                }
              />
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <Link href={fanHubHref} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', marginRight: 8 }}>
              {tx.growthHubOpenFanHub}
            </Link>
            <Link href={insightsHref} className="btn-outline quick-action-btn" style={{ textDecoration: 'none' }}>
              {tx.growthHubOpenArtistInsights}
            </Link>
          </div>
        </section>

        <section className="growth-hub-section" id="actions">
          <h2 className="growth-hub-section__title">{tx.growthHubQuickActions}</h2>
          <div className="workspace-action-grid">
            <Link href={createCampaignHref} className="btn-gold quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              {tx.growthHubCreatePlaylistCampaign}
            </Link>
            <Link href="/discover/campaigns" className="btn-outline quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              {tx.growthHubJoinPlaylistCampaign}
            </Link>
            <Link href={`/playbook${playbookQuery}`} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              {tx.growthOpenPlaybook}
            </Link>
            <Link href={fanHubHref} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              {tx.growthHubOpenFanHub}
            </Link>
            <Link href={insightsHref} className="btn-outline quick-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              {tx.growthHubOpenArtistInsights}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
