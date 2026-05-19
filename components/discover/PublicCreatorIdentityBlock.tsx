import { t } from '@/lib/i18n'
import { buildCreatorIdentity, getFeaturedRelease, type CreatorPageSettings } from '@/lib/creatorIdentity'
import PublicCreatorIdentityStrip from './PublicCreatorIdentityStrip'
import FeaturedReleaseHero from './FeaturedReleaseHero'

type Props = {
  artist: {
    id: string
    name: string
    description?: string | null
    genre?: string | null
    avatar_url?: string | null
    spotify_image_url?: string | null
    social_links?: Record<string, { url?: string } | null> | null
    page_enabled?: boolean | null
    page_slug?: string | null
    page_settings?: CreatorPageSettings | null
    created_at?: string
  }
  songs: { id: string; title: string; status?: string | null; public_hidden?: boolean | null; cover_image_url?: string | null; spotify_cover_url?: string | null; publish_content?: Record<string, unknown> | null; spotify_url?: string | null }[]
  albums: { id: string; title: string; cover_image_url?: string | null }[]
  accent?: string
  lang?: 'en' | 'no'
}

export default function PublicCreatorIdentityBlock({ artist, songs, albums, accent = '#d4a843', lang = 'en' }: Props) {
  const tx = t[lang] as Record<string, string>
  const settings = (artist.page_settings || {}) as CreatorPageSettings
  if (settings.show_public_achievements === false) return null

  const identity = buildCreatorIdentity({ artist, songs, tx })
  const levelLabel = tx[identity.levelLabelKey] || identity.levelLabelKey
  const memberSinceLabel =
    identity.memberSince && settings.show_member_since !== false
      ? `${tx.creatorMemberSince} ${new Date(identity.memberSince).toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-US', { month: 'short', year: 'numeric' })}`
      : null

  const featured = getFeaturedRelease(settings, songs, albums)

  return (
    <>
      <PublicCreatorIdentityStrip
        identity={identity}
        levelLabel={levelLabel}
        accent={accent}
        memberSinceLabel={memberSinceLabel}
        showAchievements
        profileLabel={tx.discoverStatProfile}
        releasesLabel={tx.discoverStatReleases}
      />
      {featured && featured.href && (
        <FeaturedReleaseHero featured={{ ...featured, href: featured.href }} label={tx.discoverFeaturedRelease} accent={accent} />
      )}
    </>
  )
}
