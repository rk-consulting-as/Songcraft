import type { Metadata } from 'next'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { absoluteAppUrl } from '@/lib/appUrl'
import { FALLBACK_OG_IMAGE } from '@/lib/mediaLibrary/resolveImages'

type BuildPublicMetadataInput = {
  title: string
  description: string
  path: string
  image?: string | null
  keywords?: string[]
  type?: 'website' | 'profile' | 'music.song'
}

export function buildPublicMetadata(input: BuildPublicMetadataInput): Metadata {
  const url = absoluteAppUrl(input.path)
  const image = input.image ? (input.image.startsWith('http') ? input.image : absoluteAppUrl(input.image)) : undefined
  const keywords = [
    'ViaTone',
    'artist platform',
    'music creator',
    'release campaign',
    'fan growth',
    ...(input.keywords || []),
  ]

  return {
    title: input.title,
    description: input.description,
    keywords,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      type: input.type === 'music.song' ? 'website' : (input.type || 'website'),
      siteName: BRAND_NAME,
      title: input.title,
      description: input.description,
      url: url || undefined,
      images: image ? [{ url: image, alt: input.title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: input.title,
      description: input.description,
      images: image ? [image] : undefined,
    },
  }
}

export function discoverPageMetadata(lang: 'en' | 'no' = 'en'): Metadata {
  const title = lang === 'no' ? 'Oppdag artister og releases' : 'Discover artists & releases'
  const description =
    lang === 'no'
      ? 'Utforsk trending artister, nye releases og creators på ViaTone — artist workspace, kampanjer og fan-vekst.'
      : `Explore trending artists and new releases on ${BRAND_NAME} — the creator platform for release campaigns, fan pages, and music promotion.`

  return buildPublicMetadata({
    title: `${title} · ${BRAND_NAME}`,
    description,
    path: '/discover',
    image: absoluteAppUrl(FALLBACK_OG_IMAGE),
    keywords: ['discover music', 'independent artists', BRAND_TAGLINE],
  })
}

/** Hide ViaTone branding on paid tiers later — always show for now. */
export function shouldShowViaToneBranding(_planId?: string | null): boolean {
  return true
}
