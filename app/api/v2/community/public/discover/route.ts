import { NextRequest, NextResponse } from 'next/server'
import { fetchPublicExploreData } from '@/lib/v2/data/publicDiscovery'
import type { V2PublicExploreFilters } from '@/lib/v2/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Public discovery API — explicit public-only filters, no auth required. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const filters: V2PublicExploreFilters = {
    genre: sp.get('genre') || undefined,
    platform: sp.get('platform') || undefined,
    status: (sp.get('status') as V2PublicExploreFilters['status']) || 'all',
    type: (sp.get('type') as V2PublicExploreFilters['type']) || 'all',
  }

  const data = await fetchPublicExploreData(filters)
  return NextResponse.json(data)
}
