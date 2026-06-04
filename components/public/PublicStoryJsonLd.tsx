import { buildStoryJsonLd } from '@/lib/artistStories/metadata'
import type { ArtistStory } from '@/lib/artistStories/types'
import type { StoryLinkedSong } from '@/components/public/PublicStoryLinkedSongBlock'

export default function PublicStoryJsonLd({
  story,
  artist,
  linkedSong,
}: {
  story: ArtistStory
  artist: { name: string; page_slug: string }
  linkedSong?: StoryLinkedSong | null
}) {
  const data = buildStoryJsonLd(story, artist, linkedSong)
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
