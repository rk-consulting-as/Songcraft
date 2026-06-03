import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import PublicOwnerAdSlot from '@/components/ads/PublicOwnerAdSlot'
import ViaToneBranding from '@/components/platform/ViaToneBranding'
import PublicAnalyticsTracker from '@/components/PublicAnalyticsTracker'
import { buildPublicMetadata } from '@/lib/platformGrowth/seo'
import { queryLiveArtistStoriesList } from '@/lib/artistStories/fetchPublic'
import { estimateReadTimeMinutes, formatReadTimeLabel } from '@/lib/artistStories/readTime'
import { t } from '@/lib/i18n'
import type { ArtistStory } from '@/lib/artistStories/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
)

async function fetchStoriesIndex(slug: string) {
  const { data: artist } = await sb
    .from('artists')
    .select('id, name, page_slug, user_id, page_settings, avatar_url, spotify_image_url')
    .eq('page_slug', slug)
    .eq('page_enabled', true)
    .eq('admin_hidden', false)
    .maybeSingle()
  if (!artist) return null

  const { data: stories } = await queryLiveArtistStoriesList(sb, artist.id).order('published_at', { ascending: false })

  return { artist, stories: (stories || []) as ArtistStory[] }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await fetchStoriesIndex(params.slug)
  if (!data) return { title: 'Not found' }
  const tx = t.en as Record<string, string>
  const title = `${tx.publicStoriesTitle} — ${data.artist.name}`
  const description = `${tx.publicStoriesDesc} ${data.artist.name}.`
  return buildPublicMetadata({
    title,
    description,
    path: `/p/${params.slug}/stories`,
    type: 'website',
  })
}

export default async function ArtistStoriesIndexPage({ params }: { params: { slug: string } }) {
  const data = await fetchStoriesIndex(params.slug)
  if (!data) notFound()
  const { artist, stories } = data
  const tx = t.en as Record<string, string>
  const accent = ((artist.page_settings || {}) as { accent_color?: string }).accent_color || '#d4a843'

  return (
    <div className="public-surface public-stories-index" style={{ ['--pub-accent' as string]: accent }}>
      <PublicAnalyticsTracker artistId={artist.id} eventType="artist_page_view" />
      <header className="public-stories-index__header">
        <Link href={`/p/${artist.page_slug}`} className="public-story-page__back">{tx.publicStoriesBackToArtist}</Link>
        <h1 className="public-hero__title">{tx.publicStoriesTitle}</h1>
        <p className="public-stories-index__subtitle">{artist.name}</p>
      </header>

      {stories.length === 0 ? (
        <p className="public-stories-index__empty">{tx.publicStoriesEmpty}</p>
      ) : (
        <div className="public-stories-grid">
          {stories.map(story => {
            const mins = estimateReadTimeMinutes(story.body, story.excerpt)
            const readLabel = formatReadTimeLabel(mins, { minRead: tx.storyMinRead })
            return (
              <Link key={story.slug} href={`/p/${artist.page_slug}/stories/${story.slug}`} className="public-story-card">
                {story.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={story.cover_image_url} alt="" className="public-story-card__cover" />
                ) : (
                  <div className="public-story-card__cover public-story-card__cover--empty" aria-hidden="true">📖</div>
                )}
                <div className="public-story-card__body">
                  <h2 className="public-story-card__title">{story.title}</h2>
                  <p className="public-story-card__read-time">{readLabel}</p>
                  {story.excerpt && <p className="public-story-card__excerpt">{story.excerpt}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <PublicOwnerAdSlot ownerUserId={artist.user_id} placement="artist_footer" />
      <ViaToneBranding />
    </div>
  )
}
