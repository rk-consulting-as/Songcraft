'use client'

import { t, useLang } from '@/lib/i18n'

type Props = {
  compact?: boolean
}

export default function FeaturedOnViaToneBadge({ compact }: Props) {
  const lang = useLang()
  const tx = t[lang] as Record<string, string>

  return (
    <span className={`featured-on-viatone${compact ? ' is-compact' : ''}`}>
      {tx.platformFeaturedOnViaTone}
    </span>
  )
}
