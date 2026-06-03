import type { GrowthOpportunityItem } from './types'
import type { PlaybookEngineResult } from '@/lib/playbook/computeEngine'
import type { CreatorStage } from './creatorStage'

export type GrowthRecommendationInput = {
  artists: { id: string; name: string; page_enabled?: boolean; page_slug?: string | null; page_settings?: Record<string, unknown> | null }[]
  songs: { id: string; artist_id: string; cover_image_url?: string | null; spotify_cover_url?: string | null; spotify_url?: string | null }[]
  publishedStoryCount: number
  joinedCampaignCount: number
  playbook: PlaybookEngineResult | null
  stage: CreatorStage
  tx: Record<string, string>
}

export function buildGrowthRecommendations(input: GrowthRecommendationInput): GrowthOpportunityItem[] {
  const { artists, songs, publishedStoryCount, joinedCampaignCount, playbook, stage, tx } = input
  const recs: GrowthOpportunityItem[] = []
  const primary = artists[0]

  if (publishedStoryCount === 0 && primary) {
    recs.push({
      id: 'gr-story',
      title: tx.adaptRecPublishStory,
      description: tx.adaptRecPublishStoryDesc,
      href: `/artist/${primary.id}#brand-stories`,
      impact: 'high',
    })
  }

  if (joinedCampaignCount === 0) {
    recs.push({
      id: 'gr-campaign',
      title: tx.adaptRecJoinCampaign,
      description: tx.adaptRecJoinCampaignDesc,
      href: '/discover/campaigns',
      impact: 'high',
    })
  }

  const missingCover = songs.find(s => !(s.cover_image_url || s.spotify_cover_url))
  if (missingCover) {
    recs.push({
      id: 'gr-cover',
      title: tx.adaptRecAddCover,
      description: tx.adaptRecAddCoverDesc,
      href: `/song/${missingCover.id}`,
      impact: 'medium',
    })
  }

  const epkMissing = primary && !(primary.page_settings as { epk?: { short_bio?: string } })?.epk?.short_bio
  if (epkMissing && stage !== 'starter') {
    recs.push({
      id: 'gr-epk',
      title: tx.adaptRecCreateEpk,
      description: tx.adaptRecCreateEpkDesc,
      href: `/artist/${primary.id}#epk`,
      impact: 'high',
    })
  }

  const noNewsletter = primary && !(primary.page_settings as { fan_hub?: { newsletter_draft?: string } })?.fan_hub?.newsletter_draft
  if (noNewsletter && (stage === 'releasing' || stage === 'growing')) {
    recs.push({
      id: 'gr-newsletter',
      title: tx.adaptRecEnableNewsletter,
      description: tx.adaptRecEnableNewsletterDesc,
      href: `/artist/${primary.id}#fanhub`,
      impact: 'high',
    })
  }

  const noSpotify = songs.every(s => !s.spotify_url)
  if (noSpotify && songs[0]) {
    recs.push({
      id: 'gr-spotify',
      title: tx.adaptRecImportSpotify,
      description: tx.adaptRecImportSpotifyDesc,
      href: `/song/${songs[0].id}`,
      impact: 'medium',
    })
  }

  if (artists.some(a => !a.page_enabled) && primary) {
    recs.push({
      id: 'gr-public',
      title: tx.cmdGrowthPublicPage,
      description: tx.cmdGrowthPublicPageDesc,
      href: `/artist/${primary.id}#brand-sharing`,
      impact: 'medium',
    })
  }

  const growthRecs = [
    playbook?.growth.nextRecommendation,
    playbook?.growth.growthRecommendation,
    playbook?.growth.releaseRecommendation,
  ].filter((r): r is NonNullable<typeof r> => !!r?.href)

  for (const rec of growthRecs) {
    recs.push({
      id: `gr-playbook-${rec.missionId || rec.title}`,
      title: rec.title,
      description: rec.description,
      href: rec.href!,
      impact: rec.missionId?.includes('campaign') || rec.missionId?.includes('story') ? 'high' : 'medium',
    })
  }

  const seen = new Set<string>()
  return recs.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  }).slice(0, 3)
}
