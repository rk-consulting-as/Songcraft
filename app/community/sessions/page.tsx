import SessionsIndexClient from '@/components/v2/SessionsIndexClient'
import { fetchCommunitySessions } from '@/lib/v2/data/community'

export const dynamic = 'force-dynamic'

export default async function SessionsIndexPage() {
  const { sessions, fromMock } = await fetchCommunitySessions()
  return <SessionsIndexClient sessions={sessions} fromMock={fromMock} />
}
