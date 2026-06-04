import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PublicStoryPageContent from '@/components/public/PublicStoryPageContent'
import PublicOwnerAdSlot from '@/components/ads/PublicOwnerAdSlot'
import { buildPublicMetadata } from '@/lib/platformGrowth/seo'
import { queryLiveArtistStoriesList, queryLiveArtistStoryBySlug, queryLiveArtistStoriesRelated } from '@/lib/artistStories/fetchPublic'
import { pickRelatedStories } from '@/lib/artistStories/relatedStories'
import {
  buildStoryPageDescription,
  buildStoryPageTitle,
  resolveStoryOgImage,
} from '@/lib/artistStories/metadata'
import { t } from '@/lib/i18n'
import type { ArtistStory } from '@/lib/artistStories/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
)

async function fetchStory(slug: string, storySlug: string) {
  const { data: artist } = await sb
    .from('artists')
    .select('id, name, page_slug, user_id, page_settings, avatar_url, spotify_image_url')
    .eq('page_slug', slug)
    .eq('page_enabled', true)
    .eq('admin_hidden', false)
    .maybeSingle()
  if (!artist) return null

  const { data: story } = await queryLiveArtistStoryBySlug(sb, artist.id, storySlug)
  if (!story) return null

  const [{ data: candidates }, { data: linkedSong }] = await Promise.all([
    queryLiveArtistStoriesRelated(sb, artist.id, story.id),
    story.song_id
      ? sb.from('songs').select('id, title, spotify_url, suno_url, media_links, cover_image_url, spotify_cover_url, public_hidden, admin_hidden')
          .eq('id', story.song_id)
          .eq('public_hidden', false)
          .eq('admin_hidden', false)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const relatedStories = pickRelatedStories(
    { id: story.id, story_type: story.story_type, song_id: story.song_id },
    (candidates || []) as ArtistStory[],
    4,
  )

  return {
    artist,
    story: story as ArtistStory,
    relatedStories,
    linkedSong: linkedSong || null,
  }
}

export async function generateMetadata({ params }: { params: { slug: string; storySlug: string } }): Promise<Metadata> {
  const data = await fetchStory(params.slug, params.storySlug)
  if (!data) return { title: 'Not found' }
  const title = buildStoryPageTitle(data.story, data.artist.name)
  const description = buildStoryPageDescription(data.story)
  const ogImage = resolveStoryOgImage(data.story, data.artist.avatar_url || data.artist.spotify_image_url)
  return buildPublicMetadata({
    title,
    description,
    path: `/p/${params.slug}/stories/${params.storySlug}`,
    image: ogImage,
    type: 'website',
  })
}

export default async function ArtistStoryDetailPage({ params }: { params: { slug: string; storySlug: string } }) {
  const data = await fetchStory(params.slug, params.storySlug)
  if (!data) notFound()
  const tx = t.en as Record<string, string>
  const accent = ((data.artist.page_settings || {}) as { accent_color?: string }).accent_color || '#d4a843'

  return (
    <>
      <PublicStoryPageContent
        story={data.story}
        artist={{ id: data.artist.id, name: data.artist.name, page_slug: data.artist.page_slug, page_settings: data.artist.page_settings }}
        linkedSong={data.linkedSong}
        relatedStories={data.relatedStories}
        accent={accent}
        labels={{
          backToArtist: tx.publicStoriesBackToArtist,
          relatedStories: tx.publicStoriesRelated,
          listenWatch: tx.storyListenWatch,
          openSongPage: tx.publicOpenSongPage,
          minRead: tx.storyMinRead,
        }}
      />
      <PublicOwnerAdSlot ownerUserId={data.artist.user_id} placement="artist_footer" />
    </>
  )
}
