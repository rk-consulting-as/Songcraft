import type { Lang } from '@/lib/i18n'
import { calculateReleaseCompletion } from './releaseCompletion'
import type {
  ActiveReleaseItem,
  ArtistStripItem,
  BuildCommandCenterInput,
  CommandAction,
  CommandCenterSnapshot,
  GrowthOpportunityItem,
} from './types'

function artistGrowthScore(songs: BuildCommandCenterInput['songs'], artistId: string): number {
  const rows = songs.filter(s => s.artist_id === artistId)
  if (rows.length === 0) return 0
  const avg = rows.reduce((sum, s) => sum + calculateReleaseCompletion(s), 0) / rows.length
  return Math.round(avg)
}

function resolveArtistStatus(
  artist: BuildCommandCenterInput['artists'][0],
  songs: BuildCommandCenterInput['songs'],
  activeCampaignArtistIds: Set<string>,
  tx: Record<string, string>,
): { key: string; label: string } {
  const artistSongs = songs.filter(s => s.artist_id === artist.id)
  const score = artistGrowthScore(songs, artist.id)
  if (activeCampaignArtistIds.has(artist.id)) {
    return { key: 'campaign', label: tx.cmdStatusCampaignRunning }
  }
  if (artistSongs.some(s => calculateReleaseCompletion(s) >= 75)) {
    return { key: 'ready', label: tx.cmdStatusReadyToRelease }
  }
  if (artistSongs.length === 0 || artistSongs.every(s => calculateReleaseCompletion(s) < 40)) {
    return { key: 'needs', label: tx.cmdStatusNeedsContent }
  }
  if (artist.page_enabled && artistSongs.some(s => (s.internal_play_count || 0) > 0)) {
    return { key: 'growing', label: tx.cmdStatusGrowing }
  }
  if (score >= 50) return { key: 'growing', label: tx.cmdStatusGrowing }
  return { key: 'inactive', label: tx.cmdStatusInactive }
}

export function buildCommandCenter(input: BuildCommandCenterInput): CommandCenterSnapshot {
  const {
    artists,
    songs,
    participation,
    playbook,
    releaseTasks,
    storyDrafts,
    pendingMemberCount,
    campaignTitles,
    insights,
    tx,
  } = input

  const campaignArtistIds = new Set(campaignTitles.map(c => c.artist_id).filter(Boolean) as string[])
  const actions: CommandAction[] = []

  if (participation?.joinedNeedingProofToday && participation.proofTodayCampaignId) {
    actions.push({
      id: 'proof-today',
      label: tx.cmdActionSubmitProof,
      href: `/playlist-campaigns/${participation.proofTodayCampaignId}`,
      priority: 100,
      kind: 'playlist',
    })
  } else if (participation && participation.myPendingSubmissions > 0 && participation.proofTodayCampaignId) {
    actions.push({
      id: 'proof-pending',
      label: tx.cmdActionSubmitProof,
      href: `/playlist-campaigns/${participation.proofTodayCampaignId}`,
      priority: 95,
      kind: 'playlist',
    })
  }

  if (participation && participation.pendingReviews > 0 && participation.reviewCampaignId) {
    actions.push({
      id: 'review-proofs',
      label: tx.cmdActionReviewProofs.replace('{n}', String(participation.pendingReviews)),
      href: `/playlist-campaigns/${participation.reviewCampaignId}`,
      priority: 98,
      kind: 'community',
    })
  }

  if (pendingMemberCount > 0) {
    const camp = campaignTitles[0]
    actions.push({
      id: 'approve-members',
      label: tx.cmdActionApproveMembers.replace('{n}', String(pendingMemberCount)),
      href: camp ? `/playlist-campaigns/${camp.id}` : '/discover/campaigns',
      priority: 90,
      kind: 'community',
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const task of releaseTasks.slice(0, 3)) {
    const due = new Date(`${task.due_date}T00:00:00`)
    const overdue = due < today
    actions.push({
      id: `task-${task.song_id}-${task.due_date}`,
      label: overdue
        ? `${tx.cmdActionFinishTask}: ${task.title}`
        : `${task.title} · ${task.song_title}`,
      href: `/song/${task.song_id}#campaign`,
      priority: overdue ? 88 : 70,
      kind: 'release',
    })
  }

  for (const story of storyDrafts.slice(0, 2)) {
    const artist = artists.find(a => a.id === story.artist_id)
    actions.push({
      id: `story-${story.id}`,
      label: tx.cmdActionPublishStory.replace('{title}', story.title),
      href: `/artist/${story.artist_id}#brand-stories`,
      priority: story.status === 'scheduled' ? 75 : 72,
      kind: 'story',
    })
  }

  const almostReady = songs
    .map(s => ({ song: s, completion: calculateReleaseCompletion(s) }))
    .filter(x => x.completion >= 60 && x.completion < 100)
    .sort((a, b) => b.completion - a.completion)

  for (const { song, completion } of almostReady.slice(0, 2)) {
    const missingPitch = !(song.publish_content as Record<string, unknown>)?.[`campaign_spotify_pitch`]
    actions.push({
      id: `release-${song.id}`,
      label: missingPitch
        ? tx.cmdActionFinishSpotifyPitch
        : tx.cmdActionContinueRelease.replace('{title}', song.title).replace('{pct}', String(completion)),
      href: `/song/${song.id}`,
      priority: 65 + completion / 10,
      kind: 'release',
    })
  }

  const nextPlaybook = playbook?.progress.nextTask
  if (nextPlaybook?.href) {
    actions.push({
      id: 'playbook-next',
      label: nextPlaybook.label,
      href: nextPlaybook.href,
      priority: 55,
      kind: 'playbook',
    })
  }

  const growthRec =
    playbook?.growth.nextRecommendation ||
    playbook?.growth.growthRecommendation ||
    playbook?.growth.releaseRecommendation
  if (growthRec?.href) {
    actions.push({
      id: 'growth-rec',
      label: growthRec.title,
      href: growthRec.href,
      priority: 50,
      kind: 'growth',
    })
  }

  actions.sort((a, b) => b.priority - a.priority)
  const topActions = actions.slice(0, 5)

  const artistStrip: ArtistStripItem[] = artists.map(a => {
    const status = resolveArtistStatus(a, songs, campaignArtistIds, tx)
    return {
      id: a.id,
      name: a.name,
      genre: a.genre || '',
      avatar_url: a.avatar_url,
      spotify_image_url: a.spotify_image_url || null,
      growthScore: artistGrowthScore(songs, a.id),
      statusKey: status.key,
      statusLabel: status.label,
      song_count: a.song_count || 0,
      page_enabled: a.page_enabled,
    }
  })

  const activeReleases: ActiveReleaseItem[] = songs
    .filter(s => s.status !== 'released')
    .map(s => ({
      id: s.id,
      title: s.title,
      artist_id: s.artist_id,
      artist_name: s.artists?.name || '',
      cover_url: s.cover_image_url || s.spotify_cover_url || null,
      completion: calculateReleaseCompletion(s),
      status: s.status,
      href: `/song/${s.id}`,
    }))
    .sort((a, b) => b.completion - a.completion)
    .slice(0, 5)

  const growthOpportunities: GrowthOpportunityItem[] = []
  const impact = (id: string): 'low' | 'medium' | 'high' => {
    if (id.includes('story') || id.includes('campaign') || id.includes('epk')) return 'high'
    if (id.includes('newsletter') || id.includes('featured') || id.includes('spotify')) return 'medium'
    return 'low'
  }

  if (storyDrafts.length === 0 && artists.length > 0) {
    growthOpportunities.push({
      id: 'go-story',
      title: tx.cmdGrowthFirstStory,
      description: tx.cmdGrowthFirstStoryDesc,
      href: `/artist/${artists[0].id}#brand-stories`,
      impact: 'high',
    })
  }

  if (participation && participation.hostedActiveCampaignCount === 0 && participation.joinedNeedingProofToday === 0) {
    growthOpportunities.push({
      id: 'go-playlist',
      title: tx.cmdGrowthJoinCampaign,
      description: tx.cmdGrowthJoinCampaignDesc,
      href: '/discover/campaigns',
      impact: 'high',
    })
  }

  const growthRecs = [
    playbook?.growth.nextRecommendation,
    playbook?.growth.growthRecommendation,
    playbook?.growth.releaseRecommendation,
  ].filter((r): r is NonNullable<typeof r> => !!r?.href)
  for (const rec of growthRecs) {
    growthOpportunities.push({
      id: `rec-${rec.missionId || rec.title}`,
      title: rec.title,
      description: rec.description,
      href: rec.href!,
      impact: impact(rec.missionId || ''),
    })
  }

  if (artists.some(a => !a.page_enabled)) {
    const a = artists.find(x => !x.page_enabled) || artists[0]
    growthOpportunities.push({
      id: 'go-public',
      title: tx.cmdGrowthPublicPage,
      description: tx.cmdGrowthPublicPageDesc,
      href: `/artist/${a.id}#brand-sharing`,
      impact: 'medium',
    })
  }

  const seen = new Set<string>()
  const uniqueGrowth = growthOpportunities.filter(g => {
    if (seen.has(g.id)) return false
    seen.add(g.id)
    return true
  }).slice(0, 5)

  const growthScore = playbook?.growth.growthScorePercent ?? Math.round(
    artistStrip.reduce((s, a) => s + a.growthScore, 0) / Math.max(artistStrip.length, 1),
  )

  const communityItems =
    (participation?.pendingReviews || 0) +
    (participation?.myPendingSubmissions || 0) +
    pendingMemberCount +
    (participation?.hostedActiveCampaignCount || 0)

  const releasesInProgress = songs.filter(s => s.status !== 'released').length

  return {
    actions: topActions,
    allActions: actions,
    actionCount: actions.length,
    releasesInProgress,
    communityItems,
    growthScore,
    artists: artistStrip,
    activeReleases,
    participation,
    pendingProofCount: participation?.myPendingSubmissions || 0,
    pendingReviewCount: participation?.pendingReviews || 0,
    membersAwaitingApproval: pendingMemberCount,
    activeCampaignCount: participation?.hostedActiveCampaignCount || campaignTitles.length,
    growthOpportunities: uniqueGrowth,
    insights,
    playbook,
  }
}

export function getDashboardGreeting(tx: Record<string, string>, displayName?: string | null): string {
  const hour = new Date().getHours()
  const templates = {
    morning: tx.cmdGreetingMorning,
    afternoon: tx.cmdGreetingAfternoon,
    evening: tx.cmdGreetingEvening,
  }
  const base = hour < 12 ? templates.morning : hour < 18 ? templates.afternoon : templates.evening
  const name = displayName?.trim()?.split(' ')[0] || tx.cmdGreetingFallback
  return base.replace('{name}', name)
}
