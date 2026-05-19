import type { Metadata } from 'next'
import { buildPublicMetadata } from '@/lib/platformGrowth/seo'
import { fetchPublicCampaignOg } from '@/lib/playlistCommunities/campaignPublic'

type Props = { children: React.ReactNode; params: { id: string } }

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const og = await fetchPublicCampaignOg(params.id)
    if (!og) {
      return { title: 'ViaTone — Playlist community' }
    }
    if (!og.isPublic) {
      return {
        title: `${og.title} · ViaTone`,
        description: 'Private playlist community on ViaTone.',
        robots: { index: false, follow: false },
      }
    }
    return buildPublicMetadata({
      title: `${og.title}${og.hostName ? ` · ${og.hostName}` : ''} · ViaTone`,
      description: og.description,
      path: `/playlist-campaigns/${params.id}`,
      image: og.image,
      keywords: ['playlist community', 'creator collaboration', og.playlistTitle || ''].filter(Boolean),
    })
  } catch {
    return { title: 'ViaTone — Playlist community' }
  }
}

export default function PlaylistCampaignLayout({ children }: Props) {
  return children
}
