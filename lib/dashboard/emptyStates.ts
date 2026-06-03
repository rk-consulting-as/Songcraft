import type { CreatorStage } from './creatorStage'

export type EmptyStateKey =
  | 'stories'
  | 'playlist_campaigns'
  | 'epk'
  | 'newsletter'
  | 'community'
  | 'releases'

export function getIntelligentEmptyState(
  key: EmptyStateKey,
  tx: Record<string, string>,
  stage: CreatorStage,
  firstArtistId?: string,
): { message: string; cta: string; href: string } {
  switch (key) {
    case 'stories':
      return {
        message: tx.adaptEmptyStories,
        cta: tx.adaptEmptyStoriesCta,
        href: firstArtistId ? `/artist/${firstArtistId}#brand-stories` : '/discover',
      }
    case 'playlist_campaigns':
      return {
        message: tx.adaptEmptyPlaylist,
        cta: tx.adaptEmptyPlaylistCta,
        href: '/discover/campaigns',
      }
    case 'epk':
      return {
        message: tx.adaptEmptyEpk,
        cta: tx.adaptEmptyEpkCta,
        href: firstArtistId ? `/artist/${firstArtistId}#epk` : '/growth',
      }
    case 'newsletter':
      return {
        message: stage === 'releasing' || stage === 'growing' ? tx.adaptEmptyNewsletterLaunch : tx.adaptEmptyNewsletter,
        cta: tx.adaptEmptyNewsletterCta,
        href: firstArtistId ? `/artist/${firstArtistId}#fanhub` : '/growth',
      }
    case 'community':
      return {
        message: tx.adaptEmptyCommunity,
        cta: tx.adaptEmptyPlaylistCta,
        href: '/discover/campaigns',
      }
    case 'releases':
      return {
        message: tx.adaptEmptyReleases,
        cta: tx.newSong,
        href: firstArtistId ? `/artist/${firstArtistId}#songs` : '/growth',
      }
  }
}
