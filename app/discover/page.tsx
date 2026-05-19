import DiscoverEcosystemPage from '@/components/discover/DiscoverEcosystemPage'
import { discoverPageMetadata } from '@/lib/platformGrowth/seo'

export function generateMetadata() {
  return discoverPageMetadata('en')
}

export default function DiscoverPage() {
  return <DiscoverEcosystemPage />
}
