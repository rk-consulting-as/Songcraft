import { buildStoryJsonLd } from '@/lib/artistStories/metadata'
import type { ArtistStory } from '@/lib/artistStories/types'

export default function PublicStoryJsonLd({
  story,
  artist,
}: {
  story: ArtistStory
  artist: { name: string; page_slug: string }
}) {
  const data = buildStoryJsonLd(story, artist)
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
