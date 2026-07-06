import { NextResponse } from 'next/server'
import { fetchCommunityPersonalization } from '@/lib/v2/data/personalization'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await fetchCommunityPersonalization()
  return NextResponse.json(data)
}
