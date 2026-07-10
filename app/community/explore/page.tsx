import type { Metadata } from 'next'
import V2CommunityAnalyticsTracker from '@/components/v2/V2CommunityAnalyticsTracker'
import V2JsonLd from '@/components/v2/V2JsonLd'
import V2PublicExploreClient from '@/components/v2/V2PublicExploreClient'
import { fetchCommunityDiscoverySummary } from '@/lib/v2/data/followsSaves'
import { fetchPublicExploreData } from '@/lib/v2/data/publicDiscovery'
import { exploreCollectionJsonLd, explorePageMetadata } from '@/lib/v2/seo/communityMetadata'
import type { V2PublicExploreFilters } from '@/lib/v2/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = explorePageMetadata()

type Props = { searchParams: Record<string, string | string[] | undefined> }

function pickParam(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined
}

export default async function CommunityExplorePage({ searchParams }: Props) {
  const filters: V2PublicExploreFilters = {
    genre: pickParam(searchParams.genre),
    platform: pickParam(searchParams.platform),
    status: (pickParam(searchParams.status) as V2PublicExploreFilters['status']) || 'all',
    type: (pickParam(searchParams.type) as V2PublicExploreFilters['type']) || 'all',
  }

  const [data, discoverySummary] = await Promise.all([
    fetchPublicExploreData(filters),
    fetchCommunityDiscoverySummary().catch(() => ({
      topCircles: [],
      topHosts: [],
      topSessions: [],
    })),
  ])

  return (
    <>
      <V2JsonLd data={exploreCollectionJsonLd()} />
      <V2CommunityAnalyticsTracker entityType="explore" />
      <V2PublicExploreClient
        {...data}
        discoverySummary={discoverySummary}
        initialFilters={{
          genre: filters.genre,
          platform: filters.platform,
          status: filters.status,
          type: filters.type,
        }}
      />
    </>
  )
}
