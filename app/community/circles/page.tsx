import CirclesIndexClient from '@/components/v2/CirclesIndexClient'
import { fetchCommunityCircles } from '@/lib/v2/data/community'

export const dynamic = 'force-dynamic'

export default async function CirclesIndexPage() {
  const { circles, fromMock } = await fetchCommunityCircles()
  return <CirclesIndexClient circles={circles} fromMock={fromMock} />
}
